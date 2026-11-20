// serve.mjs — local server for the VRMA viewer.
// Usage (from tools/vrma-viewer/):  node serve.mjs   → http://localhost:3600
//
//   /                 index.html (the viewer)
//   /vrma/*           clip library in ./vrma (gitignored, see README.md)
//   /models/*         avatars from babylon-clay-scene/public/models
//   GET  /api/models    list of .vrm files
//   GET  /api/verdicts  saved keep/maybe/reject marks (verdicts.json)
//   POST /api/verdicts  save them

import { createServer } from 'http';
import { readFile, writeFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { extname, join, dirname, normalize, relative } from 'path';
import { fileURLToPath } from 'url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MODELS = join(HERE, '..', '..', 'babylon-clay-scene', 'public', 'models');
const VERDICTS = join(HERE, 'verdicts.json');
const PORT = +(process.env.PORT || 3600);
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.vrm': 'model/gltf-binary', '.vrma': 'model/gltf-binary', '.glb': 'model/gltf-binary',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.csv': 'text/csv',
};

async function listVrm(dir, base = dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await listVrm(p, base));
    else if (e.name.endsWith('.vrm')) out.push('models/' + relative(base, p).replace(/\\/g, '/'));
  }
  return out;
}

// Resolve a URL path under a root, refusing anything that escapes it.
function safeJoin(root, rel) {
  const p = normalize(join(root, rel));
  return relative(root, p).startsWith('..') ? null : p;
}

createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  try {
    if (url === '/api/models') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(await listVrm(MODELS)));
    }
    if (url === '/api/verdicts') {
      if (req.method === 'POST') {
        let body = '';
        for await (const chunk of req) body += chunk;
        JSON.parse(body); // validate
        await writeFile(VERDICTS, body);
        res.writeHead(200); return res.end('ok');
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(existsSync(VERDICTS) ? await readFile(VERDICTS) : '{}');
    }
    const path = url.startsWith('/models/')
      ? safeJoin(MODELS, url.slice('/models/'.length))
      : safeJoin(HERE, url === '/' ? 'index.html' : url.slice(1));
    if (!path) { res.writeHead(403); return res.end('Forbidden'); }
    const data = await readFile(path);
    res.writeHead(200, { 'Content-Type': MIME[extname(path)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
}).on('error', (e) => {
  if (e.code !== 'EADDRINUSE') throw e;
  console.log(`\nPort ${PORT} is already in use: the viewer is probably already running at http://localhost:${PORT}`);
  console.log('Open that, or stop the other copy, or pick another port:  $env:PORT=3601; node serve.mjs  (PowerShell)\n');
  process.exit(1);
}).listen(PORT, () => {
  console.log(`\nVRMA viewer: http://localhost:${PORT}\n`);
  if (!existsSync(join(HERE, 'vrma'))) console.log('  (no ./vrma folder yet — see README.md for where to get the clips)\n');
  if (!existsSync(join(HERE, 'review.json'))) console.log('  (no review.json — run `node review_vrma.mjs` for stats and idle ranking)\n');
});
