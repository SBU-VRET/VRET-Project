# babylon-clay-scene

A Vite + Babylon.js + TypeScript demo: animated VRM avatars with audio-driven facial animation, running in WebXR. Ported from the legacy `TLTMedia/VRET` repo (jungu branch base, plus animation tooling from bennett).

This README is a living overview of the folder — extend it as new files/folders get added or as their role changes.

## Quick start

```
npm install
npm run dev
```
Opens at `http://localhost:3000`. Requires the sibling `../models/` folder (VRM avatar files) to exist one directory up — see [Structure](#structure) below.

## Structure

| Path | Role |
|---|---|
| `src/App.ts` | Main scene setup — engine/camera/physics init, loads the base scene, loads avatars via `A2FAvatar`, sets up WebXR + movement controls |
| `src/main.ts` | Entry point, bootstraps `App` |
| `A2FAvatar.js` | Avatar class — loads a VRM model + a manifest (`scene.json`), plays animation clips against it |
| `scene.json`, `scene2.json` | Per-character manifests: which VRM avatar to load, idle/breathing params, and the list of animation clips (each pairing an animation file with an audio file) |
| `animations/` | Converted animation data (`*_frames.json`) plus the two converter scripts — see [Animation converters](#animation-converters) |
| `audio/` | Voice line `.wav` files referenced by the scene manifests |
| `public/scene/` | Base environment scene exported from the Babylon editor (`example.babylon` + texture/env assets) |
| `../models/` (parent dir, **not** inside this folder) | VRM avatar files, served via a custom Vite dev-server middleware in `vite.config.ts` that reaches one directory up |

*(TODO: expand this table as more of the pipeline gets ported in — e.g. `public/scene/assets/`, `vite.config.ts` plugin details, WebXR controls.)*

## Animation converters

Both `Audio2Face-3D` (NVIDIA) and `LAM Audio2Expression` are external tools that turn a voice recording into facial blend-shape animation — you run one of them outside this repo, then use one of these scripts to convert its output into the JSON format `A2FAvatar.js` actually plays.

| | `animations/csv_converter.py` | `animations/parse_a2e.py` |
|---|---|---|
| Source tool | NVIDIA Audio2Face-3D | LAM Audio2Expression |
| Input format | CSV | JSON |
| CLI? | Yes (`-o`, `--fps`, `--precision`) | No — hardcoded input/output filenames |

Full write-up of how each script works internally is in [`ANIMATION_PIPELINE.md`](./ANIMATION_PIPELINE.md).
