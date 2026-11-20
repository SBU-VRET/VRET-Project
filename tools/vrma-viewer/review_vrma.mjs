// review_vrma.mjs — measure every .vrma clip and rank how usable it is as an idle.
//
// Usage (from tools/vrma-viewer/):   node review_vrma.mjs [vrmaDir] [--out review.json]
//
// Reads each clip's glTF binary directly (no browser, no Babylon) and computes
// motion stats from the humanoid bone tracks. Distances are divided by the
// clip's own leg length, so they compare across CMU subjects of different size.
// Writes review.json (read by index.html) and review.csv (open in Excel).

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'fs';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const OUT = outIdx >= 0 ? args[outIdx + 1] : join(HERE, 'review.json');
const DIR = args.find((a, i) => !a.startsWith('--') && i !== outIdx + 1) || join(HERE, 'vrma');
const FPS = 30;

const GROUPS = {
  torso: ['spine', 'chest', 'upperChest', 'neck', 'head'],
  arms: ['leftShoulder', 'leftUpperArm', 'leftLowerArm', 'leftHand',
         'rightShoulder', 'rightUpperArm', 'rightLowerArm', 'rightHand'],
  legs: ['leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'rightUpperLeg', 'rightLowerLeg', 'rightFoot'],
};
const BODY = [...GROUPS.torso, ...GROUPS.arms, ...GROUPS.legs];

// ── glTF binary parsing ───────────────────────────────────────────────────────
function parseGlb(buf) {
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  const binStart = 20 + jsonLen + 8;
  return { json, bin: buf.subarray(binStart) };
}
const NCOMP = { SCALAR: 1, VEC3: 3, VEC4: 4 };
function readAccessor(json, bin, idx) {
  const acc = json.accessors[idx];
  const bv = json.bufferViews[acc.bufferView];
  const n = NCOMP[acc.type];
  const off = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  const stride = bv.byteStride || n * 4;
  const out = new Float32Array(acc.count * n);
  for (let i = 0; i < acc.count; i++)
    for (let c = 0; c < n; c++) out[i * n + c] = bin.readFloatLE(off + i * stride + c * 4);
  return out;
}

// ── math ──────────────────────────────────────────────────────────────────────
const qdot = (a, i, b, j) => a[i] * b[j] + a[i + 1] * b[j + 1] + a[i + 2] * b[j + 2] + a[i + 3] * b[j + 3];
const qangle = (d) => 2 * Math.acos(Math.min(1, Math.abs(d))) * 180 / Math.PI; // degrees
const len3 = (v) => Math.hypot(v[0], v[1], v[2]);

// Resample a track to FPS (linear; quats nlerped with sign fix).
function resample(times, vals, n, frames) {
  const out = new Float32Array(frames * n);
  let k = 0;
  for (let f = 0; f < frames; f++) {
    const t = f / FPS;
    while (k < times.length - 2 && times[k + 1] < t) k++;
    const t0 = times[k], t1 = times[Math.min(k + 1, times.length - 1)];
    const a = t1 > t0 ? Math.min(1, Math.max(0, (t - t0) / (t1 - t0))) : 0;
    const i0 = k * n, i1 = Math.min(k + 1, times.length - 1) * n;
    let sign = 1;
    if (n === 4 && qdot(vals, i0, vals, i1) < 0) sign = -1;
    let norm = 0;
    for (let c = 0; c < n; c++) {
      const v = vals[i0 + c] * (1 - a) + sign * vals[i1 + c] * a;
      out[f * n + c] = v; norm += v * v;
    }
    if (n === 4) { norm = Math.sqrt(norm) || 1; for (let c = 0; c < 4; c++) out[f * 4 + c] /= norm; }
  }
  return out;
}

// Yaw (deg) of the hips' forward axis after rotation q.
function yawOf(q, i) {
  const [x, y, z, w] = [q[i], q[i + 1], q[i + 2], q[i + 3]];
  // rotate (0,0,1)
  const fx = 2 * (x * z + w * y), fz = 1 - 2 * (x * x + y * y);
  return Math.atan2(fx, fz) * 180 / Math.PI;
}

function analyse(file) {
  const { json, bin } = parseGlb(readFileSync(file));
  const hb = json.extensions?.VRMC_vrm_animation?.humanoid?.humanBones || {};
  const nodeToBone = new Map(Object.entries(hb).map(([b, v]) => [v.node, b]));
  const anim = json.animations?.[0];
  if (!anim) return { error: 'no animation' };

  // Leg length from rest translations (upperLeg→lowerLeg→foot).
  const nt = (b) => (hb[b] ? json.nodes[hb[b].node].translation || [0, 0, 0] : [0, 0, 0]);
  const L = (len3(nt('leftLowerLeg')) + len3(nt('leftFoot'))) || 1;

  const rot = {}, tr = {};
  let duration = 0;
  for (const ch of anim.channels) {
    const bone = nodeToBone.get(ch.target.node);
    if (!bone) continue;
    const s = anim.samplers[ch.sampler];
    const times = readAccessor(json, bin, s.input);
    duration = Math.max(duration, times[times.length - 1]);
    const vals = readAccessor(json, bin, s.output);
    (ch.target.path === 'rotation' ? rot : tr)[bone] = { times, vals };
  }
  const frames = Math.max(2, Math.floor(duration * FPS) + 1);
  const R = {};
  for (const [b, { times, vals }] of Object.entries(rot)) R[b] = resample(times, vals, 4, frames);
  const H = tr.hips ? resample(tr.hips.times, tr.hips.vals, 3, frames) : null;
  const bones = BODY.filter((b) => R[b]);

  // Per-frame mean angular change → detect leading reference/T-pose frames.
  const delta = new Float32Array(frames);
  for (let f = 1; f < frames; f++) {
    let s = 0;
    for (const b of bones) s += qangle(qdot(R[b], (f - 1) * 4, R[b], f * 4));
    delta[f] = s / bones.length;
  }
  const sorted = Array.from(delta.slice(1)).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] || 0;
  let start = 0;
  for (let f = 1; f < Math.min(frames, 15); f++)
    if (delta[f] > Math.max(8, median * 10)) start = f;
  const n = frames - start;
  const dur = n / FPS;

  // Angular speed per group (deg/s), mean over bones.
  const speed = (list) => {
    const bs = list.filter((b) => R[b]);
    if (!bs.length) return 0;
    let s = 0;
    for (const b of bs) for (let f = start + 1; f < frames; f++) s += qangle(qdot(R[b], (f - 1) * 4, R[b], f * 4));
    return (s / bs.length) / Math.max(dur, 1 / FPS);
  };
  // Largest deviation from the clip's first (trimmed) pose, mean over bones.
  const spread = (list) => {
    const bs = list.filter((b) => R[b]);
    if (!bs.length) return 0;
    let s = 0;
    for (const b of bs) {
      let m = 0;
      for (let f = start; f < frames; f++) m = Math.max(m, qangle(qdot(R[b], start * 4, R[b], f * 4)));
      s += m;
    }
    return s / bs.length;
  };

  let travel = 0, path = 0, yMin = Infinity, yMax = -Infinity, ySum = 0;
  if (H) {
    const x0 = H[start * 3], z0 = H[start * 3 + 2];
    for (let f = start; f < frames; f++) {
      const x = H[f * 3], y = H[f * 3 + 1], z = H[f * 3 + 2];
      travel = Math.max(travel, Math.hypot(x - x0, z - z0));
      if (f > start) path += Math.hypot(x - H[(f - 1) * 3], z - H[(f - 1) * 3 + 2]);
      yMin = Math.min(yMin, y); yMax = Math.max(yMax, y); ySum += y;
    }
  }
  // Hips yaw range (unwrapped).
  let turn = 0;
  if (R.hips) {
    let prev = yawOf(R.hips, start * 4), acc = 0, lo = 0, hi = 0;
    for (let f = start + 1; f < frames; f++) {
      const y = yawOf(R.hips, f * 4);
      let d = y - prev; if (d > 180) d -= 360; if (d < -180) d += 360;
      acc += d; prev = y; lo = Math.min(lo, acc); hi = Math.max(hi, acc);
    }
    turn = hi - lo;
  }
  // Knee bend: VRMA rest pose is identity, so the lower-leg rotation angle is the knee flex.
  // Catches crouched/ready stances that hips height alone misses.
  let knee = 0, kn = 0;
  for (const b of ['leftLowerLeg', 'rightLowerLeg']) {
    if (!R[b]) continue;
    for (let f = start; f < frames; f++) { knee += qangle(Math.abs(R[b][f * 4 + 3])); kn++; }
  }
  knee = kn ? knee / kn : 0;
  // Loop seam: how far the last frame is from the first (trimmed) one.
  let seam = 0;
  for (const b of bones) seam += qangle(qdot(R[b], start * 4, R[b], (frames - 1) * 4));
  seam = bones.length ? seam / bones.length : 0;
  const seamMove = H ? Math.hypot(H[(frames - 1) * 3] - H[start * 3], H[(frames - 1) * 3 + 2] - H[start * 3 + 2]) / L : 0;

  return {
    duration: +dur.toFixed(2),
    trimmedFrames: start,
    travel: +(travel / L).toFixed(2),            // max horizontal distance from start, in leg lengths
    path: +(path / L).toFixed(2),                // total horizontal distance walked, in leg lengths
    hipsHeight: H ? +((ySum / n) / L).toFixed(2) : null, // mean hips height, in leg lengths (~1 standing)
    hipsYRange: H ? +((yMax - yMin) / L).toFixed(2) : null,
    turn: Math.round(turn),                      // hips yaw range, degrees
    knee: Math.round(knee),                      // mean knee bend, degrees (~0–15 standing)
    activity: +speed(BODY).toFixed(1),           // mean angular speed, deg/s
    arms: +speed(GROUPS.arms).toFixed(1),
    legs: +speed(GROUPS.legs).toFixed(1),
    torso: +speed(GROUPS.torso).toFixed(1),
    armSpread: Math.round(spread(GROUPS.arms)),  // max deviation from start pose, deg
    legSpread: Math.round(spread(GROUPS.legs)),
    seam: Math.round(seam),                      // first-vs-last pose difference, deg
    seamMove: +seamMove.toFixed(2),
  };
}

// Category + idle score (lower = better idle candidate).
function judge(s, desc) {
  const flags = [];
  if (s.duration < 3) flags.push('short');
  // path is a rate: mocap jitter adds up over long clips, so total distance alone over-flags them.
  if (s.travel > 0.8 || s.path / Math.max(s.duration, 1) > 0.3) flags.push('moves around');
  if (s.hipsHeight !== null && s.hipsHeight < 0.75) flags.push('low hips (sit/crouch/floor)');
  if (s.hipsYRange > 0.3) flags.push('big up/down');
  if (s.knee > 30) flags.push('bent knees (crouch/ready stance)');
  if (s.turn > 45) flags.push('turns');
  if (s.legSpread > 35) flags.push('big leg motion');
  if (s.armSpread > 70) flags.push('big arm motion');
  if (s.activity > 40) flags.push('very active');
  if (s.activity < 1.5) flags.push('frozen');

  let category = 'other';
  if (flags.includes('frozen')) category = 'static';
  else if (flags.includes('moves around')) category = 'locomotion';
  else if (flags.includes('low hips (sit/crouch/floor)')) category = 'sit/crouch';
  else if (!flags.some((f) => ['turns', 'big leg motion', 'big arm motion', 'very active', 'big up/down',
    'bent knees (crouch/ready stance)'].includes(f)))
    category = 'idle candidate';

  // Score: prefer subtle, standing, in-place, loopable, long-enough motion.
  let score = 0;
  score += Math.max(0, s.travel - 0.15) * 20;
  score += Math.max(0, 0.9 - (s.hipsHeight ?? 1)) * 40;
  score += Math.max(0, s.turn - 15) * 0.3;
  score += Math.max(0, s.knee - 15) * 0.5;
  score += Math.max(0, s.legSpread - 12) * 0.5;
  score += Math.max(0, s.armSpread - 30) * 0.2;
  score += Math.abs(s.activity - 10) * 0.3;     // ~10 deg/s reads as "alive but calm"
  score += s.seam * 0.15 + s.seamMove * 10;      // loops cleanly
  score += s.duration < 4 ? 10 : 0;
  if (/\b(idle|wait|stand|standing|still|breath|talk|listen|convers)/i.test(desc || '')) score -= 5;
  return { category, flags, idleScore: +score.toFixed(1) };
}

// ── main ──────────────────────────────────────────────────────────────────────
const descPath = join(HERE, 'animations.json');
const descs = new Map();
if (existsSync(descPath))
  for (const e of JSON.parse(readFileSync(descPath, 'utf8'))) descs.set(basename(e.url), e.description);

const files = readdirSync(DIR).filter((f) => f.endsWith('.vrma')).sort();
const results = [];
let i = 0;
for (const f of files) {
  i++;
  const id = f.replace(/\.vrma$/, '');
  const description = descs.get(f) || '';
  try {
    const stats = analyse(join(DIR, f));
    if (stats.error) { results.push({ id, description, error: stats.error }); continue; }
    results.push({ id, description, ...stats, ...judge(stats, description) });
  } catch (e) {
    results.push({ id, description, error: e.message });
  }
  if (i % 250 === 0) process.stderr.write(`  ${i}/${files.length}\n`);
}
results.sort((a, b) => (a.idleScore ?? 1e9) - (b.idleScore ?? 1e9));
writeFileSync(OUT, JSON.stringify(results, null, 1));

const cols = ['id', 'description', 'category', 'idleScore', 'duration', 'travel', 'path', 'hipsHeight', 'hipsYRange',
  'turn', 'knee', 'activity', 'arms', 'legs', 'torso', 'armSpread', 'legSpread', 'seam', 'seamMove', 'flags', 'error'];
const esc = (v) => (v === undefined || v === null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
writeFileSync(OUT.replace(/\.json$/, '.csv'),
  [cols.join(','), ...results.map((r) => cols.map((c) => esc(Array.isArray(r[c]) ? r[c].join('; ') : r[c])).join(','))].join('\n'));

const counts = {};
for (const r of results) counts[r.category || 'error'] = (counts[r.category || 'error'] || 0) + 1;
console.log(`Reviewed ${results.length} clips →`, counts);
console.log('Top 15 idle candidates:');
for (const r of results.slice(0, 15))
  console.log(`  ${r.id.padEnd(8)} score ${String(r.idleScore).padStart(5)}  ${r.duration}s  act ${r.activity}°/s  seam ${r.seam}°  ${r.description}`);
