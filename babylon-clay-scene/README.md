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
| `animations/` | Generator/converter scripts (`a2f_extractor.py`, `csv_converter.py`, `parse_a2e.py`) plus raw/intermediate conversion output (`.csv`, non-final `.json`) — dev-only, not served — see [Animation converters](#animation-converters) |
| `public/scene.json`, `public/scene2.json` | Per-character manifests: which VRM avatar to load, idle/breathing params, and the list of animation clips (each pairing an animation file with an audio file) |
| `public/animations/` | The final `*_frames.json` files the manifests actually reference, copied here (not symlinked) from `animations/` once generated |
| `public/audio/` | Voice line `.wav` files referenced by the scene manifests |
| `public/scene/` | Base environment scene exported from the Babylon editor (`example.babylon` + texture/env assets) |
| `public/models/` | VRM avatar files |

Everything under `public/` is served directly by Vite in both dev and production, which matters here: anything referenced at runtime via `fetch()` (manifests, animation JSON, audio, models) has to live under `public/` or it simply won't exist in a production build's `dist/` output — Vite only auto-includes files that are either inside `public/` or actually imported by the JS/HTML module graph.

*(TODO: expand this table as more of the pipeline gets ported in — e.g. `public/scene/assets/`, `vite.config.ts` plugin details, WebXR controls.)*

## Animation generator/converters

`Audio2Face-3D` (NVIDIA) and `LAM Audio2Expression` are external tools that turn a voice recording into facial blend-shape animation. **LAM is the current preferred path** (2026-10-22) — Audio2Face-3D's hosted cloud endpoint is deprecated, which removed its main advantage over LAM (avoiding local GPU use); see `docs/AUDIO2FACE_VS_AUDIO2EXPRESSION.md`. `a2f_extractor.py` calls Audio2Face-3D's own API directly and writes runtime-ready JSON in one step; the other two scripts convert an already-exported file (from running one of these tools outside this repo) into the JSON format `A2FAvatar.js` actually plays.

| | `animations/parse_a2e.py` | `animations/a2f_extractor.py` | `animations/csv_converter.py` |
|---|---|---|---|
| Source tool | LAM Audio2Expression | NVIDIA Audio2Face-3D | NVIDIA Audio2Face-3D |
| Input | JSON | `.wav` audio (calls the API itself) | CSV |
| Output | Runtime JSON | Runtime JSON directly | Runtime JSON |
| CLI? | Yes (`-o`, `--quiet`) | Yes (`--wav`, `--out`, `--fps`, gain/smoothing flags) | Yes (`-o`, `--fps`, `--precision`) |

LAM needs an NVIDIA GPU (CUDA) to run at all — if your machine doesn't have one, [animations/LAM_Audio2Expression_Colab.ipynb](animations/LAM_Audio2Expression_Colab.ipynb) runs it on a free Google Colab GPU instead.

Full write-up of how each script works internally is in [`ANIMATION_PIPELINE.md`](./ANIMATION_PIPELINE.md).
