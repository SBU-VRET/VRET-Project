// snap_clips.mjs — save a 6-frame contact sheet PNG per clip, for reviewing
// clips without playing them one by one (and so Claude can look at them).
//
// Needs `node serve.mjs` running, and Chrome or Edge installed. Node 22+.
// Usage:  node snap_clips.mjs [--top 30] [--category "idle candidate"] [--ids 140_07,113_21]
//                             [--view side] [--model models/Black/Black_F_1_Busi.vrm] [--out sheets]

import { spawn } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i >= 0 ? process.argv[i + 1] : d; };
const BASE = arg('url', 'http://localhost:3600');
const OUT = join(HERE, arg('out', 'sheets'));
const VIEW = arg('view', 'front');
const MODEL = arg('model', '');

let ids = arg('ids', '')?.split(',').filter(Boolean);
if (!ids.length) {
  const review = JSON.parse(readFileSync(join(HERE, 'review.json'), 'utf8'));
  const cat = arg('category', 'idle candidate');
  ids = review.filter((r) => !cat || r.category === cat).slice(0, +arg('top', 30)).map((r) => r.id);
}
mkdirSync(OUT, { recursive: true });

const BROWSERS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
const exe = BROWSERS.find(existsSync);
if (!exe) throw new Error('No Chrome/Edge found');
const profile = join(tmpdir(), 'vrma-snap-profile');
const PORT = 9333;
const browser = spawn(exe, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1440,400', 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page'); } catch {}
}
if (!target) { browser.kill(); throw new Error('Browser did not start'); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let seq = 0; const pending = new Map();
const pageErrors = [];
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
  else if (d.method === 'Runtime.exceptionThrown') pageErrors.push(d.params.exceptionDetails?.exception?.description || d.params.exceptionDetails?.text);
  else if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') pageErrors.push(d.params.args.map((a) => a.value ?? a.description).join(' '));
};
const send = (method, params = {}) => new Promise((r) => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 340, deviceScaleFactor: 1, mobile: false });
let ok = 0;
for (const id of ids) {
  const url = `${BASE}/?sheet=${id}${VIEW === 'side' ? '&view=side' : ''}${MODEL ? '&model=' + encodeURIComponent(MODEL) : ''}`;
  await send('Page.navigate', { url });
  let ready = false;
  for (let i = 0; i < 150 && !ready; i++) {
    await sleep(200);
    const r = await send('Runtime.evaluate', { expression: 'document.title' });
    ready = r.result?.result?.value === 'SHEET READY';
  }
  if (!ready) {
    const st = await send('Runtime.evaluate', { expression: "document.getElementById('title')?.textContent" });
    console.log(`  ${id}: timed out (page says: ${st.result?.result?.value}) ${pageErrors.splice(0).slice(0, 3).join(' | ')}`);
    continue;
  }
  pageErrors.length = 0;
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(OUT, `${id}${VIEW === 'side' ? '_side' : ''}.png`), Buffer.from(shot.result.data, 'base64'));
  ok++; console.log(`  ${id}: ok`);
}
ws.close(); browser.kill();
try { rmSync(profile, { recursive: true, force: true }); } catch {}
console.log(`Saved ${ok}/${ids.length} sheets to ${OUT}`);
