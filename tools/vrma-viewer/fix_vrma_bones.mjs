// fix_vrma_bones.mjs — repair the humanoid bone map inside the CMU .vrma clips.
//
// Usage (from tools/vrma-viewer/):  node fix_vrma_bones.mjs [srcDir] [--out vrma] [--check]
//   srcDir defaults to ./vrma (fixes in place). --check only reports, writes nothing.
//
// The old batch conversion wrote a broken VRMC_vrm_animation.humanoid map:
//   • every clip: "head" points at an empty ENDSITE node, so the real Head track is
//     ignored and the head never moves;
//   • 408 clips: the right-arm chain is shifted one joint up (rightUpperArm → the
//     RightShoulder node, rightLowerArm → RightArm, rightHand → RightForeArm…), so
//     the right arm is driven by the wrong joints and looks stuck/odd.
// The joint NAMES in every file are the standard CMU BVH ones, so this rebuilds the
// map from names. It also folds CMU's extra mid-neck joint (Neck1) into the VRM neck
// (neck = Neck × Neck1), since VRM has no bone for it and dropping it loses head motion.
// Only the JSON map and the Neck rotation samples change; nothing else in the file.
// (A rest-pose correction for CMU's splayed legs was tried and dropped: the VRM loader
// already retargets against the clip's own rest pose, so correcting it again doubled it.)

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const outI = argv.indexOf('--out');
const SRC = argv.find((a, i) => !a.startsWith('--') && i !== outI + 1) || join(HERE, 'vrma');
const OUT = outI >= 0 ? resolve(HERE, argv[outI + 1]) : SRC;
const CHECK = argv.includes('--check');

// CMU joint name → VRM humanoid bone. Two spine layouts exist in the library:
// Spine/Spine1/Spine2 (2,404 clips) and LowerBack/Spine/Spine1 (144 clips).
const COMMON = {
  Hips: 'hips', Neck: 'neck', Head: 'head',
  LeftUpLeg: 'leftUpperLeg', LeftLeg: 'leftLowerLeg', LeftFoot: 'leftFoot', LeftToeBase: 'leftToes',
  RightUpLeg: 'rightUpperLeg', RightLeg: 'rightLowerLeg', RightFoot: 'rightFoot', RightToeBase: 'rightToes',
  LeftShoulder: 'leftShoulder', LeftArm: 'leftUpperArm', LeftForeArm: 'leftLowerArm', LeftHand: 'leftHand',
  RightShoulder: 'rightShoulder', RightArm: 'rightUpperArm', RightForeArm: 'rightLowerArm', RightHand: 'rightHand',
  LThumb: 'leftThumbMetacarpal', LeftFingerBase: 'leftIndexProximal', LeftHandIndex1: 'leftIndexIntermediate',
  RThumb: 'rightThumbMetacarpal', RightFingerBase: 'rightIndexProximal', RightHandIndex1: 'rightIndexIntermediate',
};
const SPINE_A = { Spine: 'spine', Spine1: 'chest', Spine2: 'upperChest' };
const SPINE_B = { LowerBack: 'spine', Spine: 'chest', Spine1: 'upperChest' };

function parse(buf) {
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  const binHeader = 20 + jsonLen;
  return { json, binChunk: buf.subarray(binHeader) }; // includes BIN chunk header
}
function build(json, binChunk) {
  let js = Buffer.from(JSON.stringify(json), 'utf8');
  const pad = (4 - (js.length % 4)) % 4;
  js = Buffer.concat([js, Buffer.alloc(pad, 0x20)]);
  const header = Buffer.alloc(20);
  header.write('glTF', 0); header.writeUInt32LE(2, 4);
  header.writeUInt32LE(20 + js.length + binChunk.length, 8);
  header.writeUInt32LE(js.length, 12); header.write('JSON', 16);
  return Buffer.concat([header, js, binChunk]);
}

// Hamilton product a*b on float arrays (x,y,z,w).
function qmul(ax, ay, az, aw, bx, by, bz, bw) {
  return [aw * bx + ax * bw + ay * bz - az * by, aw * by - ax * bz + ay * bw + az * bx,
          aw * bz + ax * by - ay * bx + az * bw, aw * bw - ax * bx - ay * by - az * bz];
}

const files = readdirSync(SRC).filter((f) => f.endsWith('.vrma')).sort();
if (!CHECK) mkdirSync(OUT, { recursive: true });
let changed = 0, rightArm = 0, neckFolded = 0, already = 0;
for (const f of files) {
  const buf = readFileSync(join(SRC, f));
  const { json, binChunk } = parse(buf);
  const ext = json.extensions?.VRMC_vrm_animation;
  if (!ext) continue;
  if (ext.extras?.boneMapFixed) { already++; if (!CHECK && OUT !== SRC) writeFileSync(join(OUT, f), buf); continue; }
  const byName = new Map(json.nodes.map((n, i) => [n.name, i]));
  const table = { ...COMMON, ...(byName.has('LowerBack') ? SPINE_B : SPINE_A) };
  const humanBones = {};
  for (const [name, bone] of Object.entries(table)) if (byName.has(name)) humanBones[bone] = { node: byName.get(name) };

  const old = ext.humanoid.humanBones;
  if (old.rightUpperArm?.node !== humanBones.rightUpperArm?.node) rightArm++;

  // Fold Neck1 into Neck: overwrite Neck's rotation samples with Neck × Neck1.
  const anim = json.animations[0];
  const rotCh = (nodeName) => anim.channels.find((c) => c.target.path === 'rotation' && c.target.node === byName.get(nodeName));
  const cN = rotCh('Neck'), cN1 = rotCh('Neck1');
  let folded = false;
  if (cN && cN1) {
    const sN = anim.samplers[cN.sampler], sN1 = anim.samplers[cN1.sampler];
    const aN = json.accessors[sN.output], aN1 = json.accessors[sN1.output];
    if (aN.count === aN1.count && json.accessors[sN.input].count === json.accessors[sN1.input].count) {
      const off = (acc) => 8 + (json.bufferViews[acc.bufferView].byteOffset || 0) + (acc.byteOffset || 0); // +8 = BIN chunk header
      const oN = off(aN), oN1 = off(aN1);
      const q = new Float32Array(aN.count * 4);
      for (let i = 0; i < aN.count; i++) {
        const a = [0, 1, 2, 3].map((k) => binChunk.readFloatLE(oN + (i * 4 + k) * 4));
        const b = [0, 1, 2, 3].map((k) => binChunk.readFloatLE(oN1 + (i * 4 + k) * 4));
        q.set(qmul(...a, ...b), i * 4);
      }
      if (!CHECK) for (let i = 0; i < q.length; i++) binChunk.writeFloatLE(q[i], oN + i * 4);
      delete aN.min; delete aN.max; // stale after rewrite; optional in glTF
      folded = true; neckFolded++;
    }
  }

  ext.humanoid.humanBones = humanBones;
  ext.extras = { ...(ext.extras || {}), boneMapFixed: true, neck1FoldedIntoNeck: folded };
  changed++;
  if (!CHECK) writeFileSync(join(OUT, f), build(json, binChunk));
}
console.log(`${CHECK ? '[check] would fix' : 'Fixed'} ${changed} clips (${rightArm} had the shifted right arm; Neck1 folded into neck in ${neckFolded}).` +
  (already ? ` ${already} were already fixed.` : ''));
