# babylon-clay-scene

A Vite + Babylon.js + TypeScript demo: animated VRM avatars with audio-driven facial animation, running in WebXR. Ported from the legacy `TLTMedia/VRET` repo (jungu branch base, plus animation tooling from bennett).

This README is a living overview of the folder — extend it as new files/folders get added or as their role changes.

## Quick start

```
npm install
npm run dev
```
Opens at `http://localhost:3000`.

## Structure

| Path | Role |
|---|---|
| `src/App.ts` | Main scene setup — engine/camera/physics init, loads the base scene, loads avatars via `A2FAvatar`, sets up WebXR + movement controls |
| `src/main.ts` | Entry point, bootstraps `App` |
| `A2FAvatar.js` | Avatar class — loads a VRM model + a manifest (`scene.json`), plays animation clips against it |
| `animations/` | Converter scripts (`csv_converter.py`, `parse_a2e.py`) plus raw/intermediate conversion output (`.csv`, non-final `.json`) — dev-only, not served — see [Animation converters](#animation-converters) |
| `public/scene.json`, `public/scene2.json` | Per-character manifests: which VRM avatar to load, idle/breathing params, and the list of animation clips (each pairing an animation file with an audio file) |
| `public/animations/` | The final `*_frames.json` files the manifests actually reference, copied here (not symlinked) from `animations/` once generated |
| `public/audio/` | Voice line `.wav` files referenced by the scene manifests |
| `public/scene/` | Base environment scene exported from the Babylon editor (`example.babylon` + texture/env assets) |
| `public/models/` | VRM avatar files |

Everything under `public/` is served directly by Vite in both dev and production, which matters here: anything referenced at runtime via `fetch()` (manifests, animation JSON, audio, models) has to live under `public/` or it simply won't exist in a production build's `dist/` output — Vite only auto-includes files that are either inside `public/` or actually imported by the JS/HTML module graph.

*(TODO: expand this table as more of the pipeline gets ported in — e.g. `public/scene/assets/`, `vite.config.ts` plugin details, WebXR controls.)*

## Animation converters

Both `Audio2Face-3D` (NVIDIA) and `LAM Audio2Expression` are external tools that turn a voice recording into facial blend-shape animation — you run one of them outside this repo, then use one of these scripts to convert its output into the JSON format `A2FAvatar.js` actually plays.

| | `animations/csv_converter.py` | `animations/parse_a2e.py` |
|---|---|---|
| Source tool | NVIDIA Audio2Face-3D | LAM Audio2Expression |
| Input format | CSV | JSON |
| CLI? | Yes (`-o`, `--fps`, `--precision`) | No — hardcoded input/output filenames |

Full write-up of how each script works internally is in [`ANIMATION_PIPELINE.md`](./ANIMATION_PIPELINE.md).
