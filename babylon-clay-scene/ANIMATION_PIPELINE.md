# Animation Pipeline Guide

End-to-end workflow for turning an audio file into an animated VRM character
in the Babylon.js scene. Covers:

1. The `scene*.json` manifest format that `A2FAvatar` consumes.
2. The scripts that produce per-clip animation JSON:
   - `animations/parse_a2e.py` — converts **LAM Audio2Expression (A2E)** JSON
     output into runtime JSON. **Current preferred path** (2026-10-22) — see
     Section 6.
   - `animations/a2f_extractor.py` — calls **NVIDIA Audio2Face-3D** directly over
     its gRPC API and writes runtime-ready JSON in one step (no manual export).
     Its hosted cloud endpoint is now deprecated — see Section 4.
   - `animations/csv_converter.py` — converts an already-exported **Audio2Face-3D**
     CSV (e.g. from the Omniverse app's own UI) into runtime JSON.
3. The end-to-end audio → character workflow.

---

## 1. How the runtime loads animations

The runtime entry point is [src/App.ts](src/App.ts). For each character it
constructs an `A2FAvatar` and calls `loadManifest(...)`:

```ts
const avatar = new A2FAvatar(scene);
await avatar.loadManifest(`${import.meta.env.BASE_URL}scene.json`);

const secondCharacter = new A2FAvatar(scene);
await secondCharacter.loadManifest(`${import.meta.env.BASE_URL}scene2.json`);
```

Each manifest describes **one character** and the sequence of animation clips
it will play. Two avatars = two manifests. Manifests live in `public/` (as
`public/scene.json`, `public/scene2.json`), not the project root — anything
fetched at runtime has to be under `public/` or it won't exist in a production
build. `import.meta.env.BASE_URL` resolves to `/` in dev and to the deployed
site's base path in production (e.g. `/VRET-Project/` on GitHub Pages), so the
fetch works correctly in both.

`A2FAvatar.loadManifest(...)` ([A2FAvatar.js:125](A2FAvatar.js)) does the
following:

1. `fetch`es the manifest JSON.
2. Merges `manifest.idle` into the avatar's idle config (blink/breathing).
3. Loads the VRM at `manifest.avatar` via the GLTF loader.
4. For each entry in `manifest.clips`, fetches the animation JSON (if any),
   notes the audio path (if any), and stores a `{animData, audioSrc, id,
   delayAfter}` clip object.
5. Drops into `IDLE` state. `playSequence()` / `playClip(i)` is called by the
   UI buttons defined in `App._createAvatarUI`.

---

## 2. Scene manifest schema (`scene.json`)

A scene file is a single JSON object with three top-level fields.

```json
{
  "avatar": "models/Black/Black_F_1_Busi.vrm",
  "idle": {
    "blinkIntervalMin": 2.0,
    "blinkIntervalMax": 5.0,
    "blinkDuration": 0.15,
    "breathCycleSpeed": 0.4,
    "breathJawAmount": 0.05
  },
  "clips": [
    {
      "id": "recite_1",
      "animation": "animations/altaforte_frames.json",
      "audio": "audio/altaforte.wav",
      "delayAfter": 0
    }
  ]
}
```

### `avatar` (string, required)
URL of the `.vrm` file to load. Fetched via Babylon's GLTF loader with
`pluginExtension: ".glb"`. Path is resolved relative to the served page, the
same as the manifest itself.

### `idle` (object, optional)
Idle-state behaviour. All fields are optional; each key shown overrides
the matching default from `A2FAvatar` constructor defaults
([A2FAvatar.js:96-97](A2FAvatar.js)).

| Field              | Type   | Default | Meaning                                                  |
| ------------------ | ------ | ------- | -------------------------------------------------------- |
| `blinkIntervalMin` | number | 2.0     | Min seconds between blinks                               |
| `blinkIntervalMax` | number | 5.0     | Max seconds between blinks                               |
| `blinkDuration`    | number | 0.15    | Length of one blink (seconds, triangle in→out)           |
| `breathCycleSpeed` | number | 0.4     | Breathing frequency multiplier                           |
| `breathJawAmount`  | number | 0.012   | How far the jaw opens at peak inhale (morph weight 0–1)  |

### Head sway and eye gaze (not in `scene.json`)
Two more idle behaviors run alongside blink/breathing — `_tickHeadSway()`
and `_tickGaze()` in `A2FAvatar.js`. Neither is driven by generated
animation data (LAM's ARKit-52 output has no head pose at all, and this
avatar rig has no gaze blendshapes), so both are driven procedurally in
code instead, the same way blink is. Unlike the `idle` fields above,
their amplitude/timing constants are hardcoded in `A2FAvatar.js`, not
exposed through `scene.json` — there was no need yet to vary them
per-avatar. Head sway rotates the head bone with small mismatched sine
waves; eye gaze picks random small glances and rotates the `LeftEye`/
`RightEye` bones to match, doing the rest-pose/offset math in 4x4
matrices (not quaternions) since the avatar's mirrored export scale
corrupts quaternion math partway through — see the gitignored
`docs/FACIAL_ANIM_REGEN_NOTES.md` for the full debugging history.

### `clips` (array, required)
Played in array order by `avatar.playSequence()`. Each entry:

| Field         | Type             | Required | Meaning                                                                                                                |
| ------------- | ---------------- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| `id`          | string           | yes      | Free-form name. Used for logging and `onClipStart`/`onClipEnd` callbacks.                                              |
| `animation`   | string \| null   | no       | URL of a converted animation JSON (the output of `csv_converter.py` or `parse_a2e.py`). `null` or `"N/A"` → no morphs. |
| `audio`       | string \| null   | no       | URL of the audio file (`.wav`, `.mp3`, …). `null` or `"N/A"` → silent.                                                 |
| `delayAfter`  | number           | no       | Seconds of idle between this clip and the next. Default `1.0`.                                                         |

**Three useful clip shapes**

- **Normal clip**: both `animation` and `audio` set. Playback is driven by
  `audio.currentTime` so morphs stay in sync with the audio.
  ([A2FAvatar.js:449](A2FAvatar.js))
- **Silent animation**: `animation` set, `audio: null`. Playback advances by
  real time (`dt`).
- **Pure delay (no-op)**: both `animation: null` and `audio: null`. The clip
  returns immediately, but `delayAfter` still applies — so this is how you
  schedule "do nothing for N seconds." Example from
  [scene3.json](scene3.json):

  ```json
  { "id": "wait_2", "animation": null, "audio": null, "delayAfter": 23 }
  ```

---

## 3. Per-clip animation JSON schema

Both converter scripts produce the same shape, which is what `A2FAvatar`
expects in `_tickPlaying` ([A2FAvatar.js:441](A2FAvatar.js)):

```json
{
  "fps": 30,
  "frameCount": 574,
  "blendShapeNames": ["eyeBlinkLeft", "eyeBlinkRight", "jawOpen", "..."],
  "frames": [
    { "time": 0.0,    "weights": [0.0, 0.0, 0.0, ...] },
    { "time": 0.0333, "weights": [0.12, 0.0, 0.05, ...] }
  ]
}
```

- `fps` — Sampling rate. The runtime picks a frame via
  `floor(playbackTime * fps)`.
- `frameCount` — Number of entries in `frames`. Must match `frames.length`.
- `blendShapeNames` — Ordered list of morph-target names. Each `frames[i].weights`
  is a flat array of the same length, in the same order.
- `frames[i].time` — Seconds from clip start. Currently informational; the
  runtime indexes by `fps` not by `time`.
- `frames[i].weights` — One float per name in `blendShapeNames`. Values are
  morph influences, typically 0–1.

### Morph-target naming

Names must match the VRM's morph-target names. The included `Black_F_1_Busi`
VRM uses ARKit-style **camelCase + `Left`/`Right`** suffixes:
`eyeBlinkLeft`, `mouthSmileRight`, `jawOpen`, `browInnerUp`, etc. Both
converters normalise to that convention.

A few names are also driven on the teeth meshes via the `TEETH_MAP` in
[A2FAvatar.js:16](A2FAvatar.js) (`jawOpen`, `mouthFunnel`, `mouthClose` →
matching morphs on `h_TeethDown` / `h_TeethUp`). You don't have to do anything
to enable that — it's automatic whenever those shapes appear in your
animation.

---

## 4. Generator — Audio2Face-3D gRPC API → animation JSON directly

**⚠️ 2026-10-22: NVIDIA's hosted NVCF cloud endpoint (`grpc.nvcf.nvidia.com`,
what this script and `a2f_config.json` point at) is now deprecated** — the
build.nvidia.com page shows "This NIM Endpoint has been deprecated. Please
transition to another model to avoid any service interruptions," no
replacement named. It may still respond for now, but don't build new work on
it. Audio2Face-3D itself still exists and can be self-hosted, but that needs
real GPU hardware — see `docs/AUDIO2FACE_VS_AUDIO2EXPRESSION.md` for the
updated tradeoff against LAM Audio2Expression now that this no longer avoids
local GPU strain.

Script: [animations/a2f_extractor.py](animations/a2f_extractor.py), ported over
from the legacy TLTMedia repo (`a2f_extractor.py`, added by JunGu Kang) and
adapted to write runtime JSON directly instead of its original standalone
format. This is a **generator**, not a converter — it calls Audio2Face-3D's
gRPC API itself and writes `public/animations/`-ready JSON in one step,
skipping the manual "export CSV from the Omniverse app, then run
`csv_converter.py`" round trip that Converter A below requires.

**Important: the current 4 production clips were *not* made with this
script.** They were traced back to a direct CSV export committed by a
teammate (commit `68fd12d` in the legacy repo, predating this script by three
days) — see `docs/FACIAL_ANIM_REGEN_NOTES.md` for the investigation. This
script is the first actually-usable, parameter-controlled path we have for
regenerating or producing new clips going forward.

### How to run it

1. **Install dependencies**:
   ```powershell
   pip install grpcio nvidia-ace
   ```
2. **Get NVIDIA API credentials.** Sign up for the free developer tier at
   `build.nvidia.com` and find Audio2Face-3D to get an API key. The
   `function_id` picks which character/voice model to use — 6 known ones are
   baked into the script's `--compare-all` list; default is
   `8efc55f5-6f00-424e-afe9-26212cd2c630` ("Mark", tongue channels enabled).
3. **Create `animations/a2f_config.json`** (gitignored — never commit API
   keys):
   ```json
   {
     "nvidia_api_key": "YOUR KEY",
     "function_id": "8efc55f5-6f00-424e-afe9-26212cd2c630",
     "endpoint": "grpc.nvcf.nvidia.com:443"
   }
   ```
4. **Make sure your input audio is 16-bit PCM WAV, uncompressed** — the
   script checks this up front and errors clearly if not.
5. **Run it**, from `babylon-clay-scene/`:
   ```powershell
   python animations\a2f_extractor.py --wav public\audio\myaudio.wav `
     --out public\animations\myaudio_frames_test.json --fps 30
   ```
   Prints connection/progress logs, then a diagnostic summary (frame counts,
   near-zero/saturated blendshapes, gain warnings). Output lands directly in
   the runtime schema — no extra conversion step needed.

   Point `--out` at a new filename rather than overwriting an existing
   production clip directly, so the result can be A/B compared before
   replacing anything — especially relevant here since the current 4
   production clips have no known baseline settings to compare against (see
   the note above).
6. **Optional: compare character voices** on the same audio before settling
   on one:
   ```powershell
   python animations\a2f_extractor.py --wav public\audio\myaudio.wav `
     --out public\animations\test.json --compare-all
   ```
7. **Wire the result into a scene.** Point a clip's `animation` field at the
   new file in `public/scene.json`/`scene2.json` (see Section 2), then
   `npm run dev` and check it in-browser.

### Flags

| Argument          | Required | Default            | Meaning                                                              |
| ----------------- | -------- | ------------------- | ---------------------------------------------------------------------|
| `--wav`           | yes      | —                   | Input audio. Must be 16-bit PCM WAV, uncompressed.                   |
| `--out`           | yes      | —                   | Output JSON path. Point this straight at `public/animations/`.       |
| `--fps`           | no       | `60`                | Output frame rate (resampled from whatever A2F returns).             |
| `--api-key`       | no       | from config/env      | Overrides `a2f_config.json` / `NVIDIA_API_KEY` env var.             |
| `--function-id`   | no       | from config          | Overrides which character/tongue variant to use.                     |
| `--global-gain`   | no       | `1.0`                | Multiplies all blendshape weights.                                   |
| `--jaw-gain`      | no       | `1.0`                | Multiplies jaw-related shapes only.                                  |
| `--lip-gain`      | no       | `1.0`                | Multiplies lip/mouth-related shapes only.                            |
| `--tongue-gain`   | no       | `1.0`                | Multiplies tongue shapes only.                                       |
| `--smooth`        | no       | `1` (none)           | Moving-average smoothing window, in frames.                          |
| `--silence-gate`  | no       | `0.0`                | Zeroes out weights below this threshold.                             |
| `--compare-all`   | no       | off                  | Tests all 6 function IDs on the same audio, prints a comparison.    |
| `--verbose`       | no       | off                  | Per-frame diagnostic output.                                        |

**This script only exposes gain/smoothing calibration, not Audio2Face-3D's
own `face_params`/`emotion_post_processing_params` fields** (see
`docs/AUDIO2FACE_VS_AUDIO2EXPRESSION.md` for the full parameter list, e.g.
`lipOpenOffset`, `lowerFaceStrength`, `blinkStrength`) — those are sent as
empty/default in `call_a2f_grpc()`. Worth extending if finer control turns
out to matter after testing the gain-based calibration already here.

It also prints a diagnostic summary after every run (frame counts, which
blendshapes are near-zero or saturated) and warns if the output looks like it
needs more gain — useful for sanity-checking a new clip before trusting it.

---

## 5. Converter A — Audio2Face-3D CSV → animation JSON

Script: [animations/csv_converter.py](animations/csv_converter.py).

### Input
The `animation_frames.csv` exported by NVIDIA Audio2Face-3D. The header row
names the columns; columns named `frame`, `time`, `timecode`, `time_code`,
`index`, or blank are treated as metadata and skipped — everything else is a
blendshape.

A2F outputs **PascalCase** names (e.g. `EyeBlinkLeft`); the script lower-cases
the first letter to produce `eyeBlinkLeft`. If a name contains a dot
(`Mesh.ShapeName`), the part after the dot is used.

### Command

```powershell
python animations\csv_converter.py <csv_file> [-o OUTPUT] [--fps FPS] [--precision N]
```

| Argument        | Required | Default                                | Meaning                                              |
| --------------- | -------- | -------------------------------------- | ---------------------------------------------------- |
| `csv_file`      | yes      | —                                      | Path to the Audio2Face CSV.                          |
| `-o`/`--output` | no       | Same basename, `.json` extension       | Output JSON path.                                    |
| `--fps`         | no       | `30`                                   | Playback FPS recorded into the output.               |
| `--precision`   | no       | `4`                                    | Decimal places for weights (keeps file size down).   |

### Examples

```powershell
# Simple: produces animations\altaforte_frames.json next to the CSV
python animations\csv_converter.py animations\altaforte_frames.csv

# Explicit output and 60 fps
python animations\csv_converter.py animations\altaforte_frames.csv `
  -o animations\altaforte_60fps.json --fps 60
```

The script prints frame/shape counts and the resulting duration on success.

---

## 6. Converter B — LAM Audio2Expression JSON → animation JSON

**This is the current preferred path (decided 2026-10-22)** — Audio2Face-3D's
hosted cloud endpoint is deprecated (see Section 4's warning), which removes
its main advantage over LAM. See `docs/AUDIO2FACE_VS_AUDIO2EXPRESSION.md` for
the full comparison.

Unlike `a2f_extractor.py`, LAM itself isn't something to port into this repo
— it's a full separate project (conda env, model weights, its own codebase),
not a small standalone script. You run it from its own clone, then convert
its output here with `parse_a2e.py`.

### No local NVIDIA GPU? Use the Colab notebook

LAM needs CUDA, so it won't run at all on a machine with only Intel/AMD
integrated graphics (no CUDA support) — confirmed this is the case on at
least one team laptop.

[animations/LAM_Audio2Expression_Colab.ipynb](animations/LAM_Audio2Expression_Colab.ipynb)
runs the same setup on a free Google Colab NVIDIA T4 GPU instead of locally.
A few path assumptions inside it are flagged inline as unconfirmed, since
LAM's own README doesn't fully reconcile its own weight/output folder layout
— **run it cell-by-cell and check each cell's output before moving to the
next**, rather than running the whole notebook blindly end to end.

1. **Upload the notebook.** Go to `colab.research.google.com` → File → Upload
   notebook → select `animations/LAM_Audio2Expression_Colab.ipynb`.
2. **Switch to a GPU runtime.** Runtime menu → Change runtime type → Hardware
   accelerator → **GPU (T4)** → Save. Skipping this means no CUDA, and
   everything downstream fails.
3. **Cell 1 — confirm the GPU is attached** (`!nvidia-smi`). Should show a
   Tesla T4; if it doesn't, redo step 2.
4. **Cell 2 — check Colab's base OS/Python** (informational only, no action
   needed).
5. **Cell 3 — install Python 3.10 and create a venv at `/content/lam_env`.**
   Colab's own default Python is newer than LAM supports, so this builds an
   isolated 3.10 environment instead (tries the default apt repo first,
   falls back to the deadsnakes PPA automatically if needed).
6. **Cell 4 — clone LAM's repo** into `/content/LAM_Audio2Expression` over
   HTTPS (public repo, no auth needed).
7. **Cell 5 — install dependencies into the venv** (torch/torchvision/
   torchaudio for CUDA 12.1, `requirements.txt`, the bundled
   `gradio_gaussian_render` wheel). Every step from here calls the venv's
   `python`/`pip` by full path instead of `activate`, since Colab cells don't
   share shell state with each other.
8. **Cell 6 — download model weights and assets** from HuggingFace, then
   extracts them. Ends with a `find` listing — **read it**, since it shows
   where the weight file actually landed, which may not match the path
   assumed in cell 8.
   - **Cell 6b (fallback)** — only run this if cell 6 errors; same download
     from NVIDIA's OSS mirror instead of HuggingFace.
9. **Cell 7 — upload your audio file(s)** via the file-picker prompt it
   shows — select multiple at once if you want several clips processed in
   one pass, not just one. Deletes any leftover `.wav` files from a previous
   run first, so a re-upload of the same clip name doesn't get silently
   renamed by Colab (`name (2).wav`) in a way that used to break inference.
10. **Cell 8 — run inference on each uploaded clip, then download its
    output JSON immediately after.** One pass per file, each writing to its
    own `exp/audio2exp_<clip name>` folder (derived from the filename), so
    clips never overwrite each other's output — and each one gets found and
    downloaded right away rather than guessed at afterward. If cell 6's
    `find` output showed a different weight path than the one hardcoded
    here, **edit the `weight=` argument before running this cell.**
11. **Convert each downloaded JSON** with `parse_a2e.py` exactly as in the
    local steps below (step 6 there), then wire it into a scene manifest
    (step 7).

### How to run LAM locally (needs an NVIDIA GPU)

1. **Clone LAM's repo and enter it** (anywhere outside this repo):
   ```bash
   git clone https://github.com/aigc3d/LAM_Audio2Expression.git
   cd LAM_Audio2Expression
   ```
   (HTTPS, not SSH — it's a public repo, no GitHub auth/SSH key needed.)
2. **Create the conda environment.** LAM only supports **Python 3.10**:
   ```bash
   conda create -n lam_a2e python=3.10
   conda activate lam_a2e
   ```
3. **Run the install script matching your CUDA version** (needs an NVIDIA
   GPU either way — no CPU path):
   ```bash
   sh ./scripts/install/install_cu121.sh   # CUDA 12.1
   # or
   sh ./scripts/install/install_cu118.sh   # CUDA 11.8
   ```
4. **Download the model weights and assets.** HuggingFace first, OSS as a
   fallback if that fails, ModelScope as a third option:
   ```bash
   huggingface-cli download 3DAIGC/LAM_audio2exp --local-dir ./
   tar -xzvf LAM_audio2exp_assets.tar && rm -f LAM_audio2exp_assets.tar
   tar -xzvf LAM_audio2exp_streaming.tar && rm -f LAM_audio2exp_streaming.tar
   ```
5. **Run inference** on your `.wav`:
   ```bash
   python inference.py --config-file configs/lam_audio2exp_config_streaming.py \
     --options save_path="exp/audio2exp" save_json_path="exp/audio2exp/output.json" \
     weight=pretrained_models/lam_audio2exp_streaming.tar \
     audio_input="/path/to/your_audio.wav" brow_movement=True
   ```
   **Keep every path quoted**, even ones that look safe — if your audio
   filename ever contains a space (e.g. a tool auto-renames a duplicate
   upload to `clip (2).wav`), an unquoted path breaks the shell command
   outright (`(` is a shell special character) and inference silently never
   runs, with no new output written and no obvious error in the usual place
   to look.

   `brow_movement=True` (decided 2026-10-23) — the streaming config defaults
   this off, meaning no brow motion gets generated at all; turned on for more
   expressive output. `movement_smooth=True` was tried 2026-10-27 and dropped
   — no measurable effect on our clips. `id_idx` is the remaining untried
   knob — see `docs/FACIAL_ANIM_REGEN_NOTES.md`.
   **`save_json_path` is required** — LAM's own README sample command omits
   it (only shows `save_path`), which is a documentation bug on their end:
   `save_path` is just the experiment/log folder (you'll get `infer.log` +
   a copy of the config there either way); the actual blendshape output
   only gets written if `save_json_path` is explicitly set, confirmed by
   reading `engines/infer.py` directly. Without it, inference runs and logs
   "End Evaluation" with no error, but silently discards the computed result
   — this cost real time to track down, see `docs/FACIAL_ANIM_REGEN_NOTES.md`.

   Or use the Gradio UI instead (`python app_lam_audio2exp.py`) if a visual
   option is preferred. There's no CLI flag for the "style"/identity input —
   it defaults to `id_idx = 0` (one of 12 trained identity classes, set in
   the config file) and isn't documented beyond that; see
   `docs/AUDIO2FACE_VS_AUDIO2EXPRESSION.md` if experimenting with it via
   `--options id_idx=N`.
6. **Copy the resulting JSON back into this repo's `animations/` folder**,
   then convert it with `parse_a2e.py` (see Input/Command below).
7. **Wire the converted file into a scene** — point a clip's `animation`
   field at it in `public/scene.json`/`scene2.json` (Section 2), then
   `npm run dev` to check it.

### Input
LAM-A2E output JSON. Expected shape (see
[animations/lam_a2e_output.json](animations/lam_a2e_output.json) for an
example):

```json
{
  "names": [ "...52 ARKit-style names..." ],
  "metadata": { "fps": 30.0, "frame_count": 574, "blendshape_names": [...] },
  "frames": [
    { "time": 0.0, "weights": [ 52 floats ], "rotation": [] },
    ...
  ]
}
```

LAM-A2E names use the `_L`/`_R` ARKit convention (`eyeBlink_L`,
`mouthSmile_R`). The script converts these to the runtime's `Left`/`Right`
convention via `arkit_to_model_name`. The 52-shape order is hard-coded in
`LAM_A2E_SHAPES` and is used as the output `blendShapeNames`.

### Command

```powershell
python animations\parse_a2e.py [input] [-o OUTPUT] [--quiet]
```

| Argument        | Required | Default                                              | Meaning                                              |
| --------------- | -------- | ----------------------------------------------------- | ---------------------------------------------------- |
| `input`         | no       | `lam_a2e_output.json`                                  | Path to LAM-A2E's output JSON.                       |
| `-o`/`--output` | no       | `model_animation.json`, or `<input>_frames.json` if `input` is given explicitly | Output JSON path. |
| `--quiet`       | no       | off                                                     | Skip printing the ARKit → model shape-name mapping.   |

```powershell
# Default (no args): reads animations\lam_a2e_output.json, writes animations\model_animation.json
python animations\parse_a2e.py

# Explicit, straight into public/animations/
python animations\parse_a2e.py path\to\lam_output.json -o public\animations\my_clip_frames.json
```

The script prints the resulting frame/shape count and, unless `--quiet`, the
ARKit-name → model-name mapping for every shape — useful when diffing against
a new VRM.

> **Note**: the converter assumes the LAM output's `frames[i].weights` array
> is already ordered to match `LAM_A2E_SHAPES`. The runtime does no name
> matching at playback — it indexes `weights[i]` against `blendShapeNames[i]`.
> If you suspect order drift, sanity-check by comparing
> `lam_data["names"]` / `metadata.blendshape_names` against `LAM_A2E_SHAPES`
> before trusting the output.

---

## 7. End-to-end workflow: audio file → animated character

1. **Pick a tool that turns audio into per-frame blendshape weights.**
   - **LAM Audio2Expression — current preferred path** (Section 6). Needs its
     own separate clone/setup (conda, GPU, model weights), run outside this
     repo, then its output JSON gets converted here.
   - NVIDIA Audio2Face-3D, called directly — `animations/a2f_extractor.py`
     writes runtime JSON in one step, skip to step 5. Its hosted cloud
     endpoint is deprecated (Section 4) — this would need self-hosting.
   - NVIDIA Audio2Face-3D, exported manually as a CSV from the Omniverse app.

2. **Drop your input audio file** somewhere the dev server can serve it.
   Convention here is `public/audio/<name>.wav`.

3. **Run the tool** on the audio file using its own CLI/UI to produce one of:
   - `lam_a2e_output.json` (LAM-A2E — see Section 6 for the full setup/run steps), or
   - Runtime-ready JSON directly, via `animations/a2f_extractor.py --wav ... --out ...`
     (skip step 4 — it already writes straight to `public/animations/`), or
   - `animation_frames.csv` (Audio2Face-3D, exported manually).

4. **Convert to the runtime format.** Only needed for the CSV/LAM paths above.

   The output has to land in `public/animations/`, not `animations/` — only
   files under `public/` are servable at runtime (`animations/` is for the
   scripts and raw/intermediate conversion output only, see [Structure](README.md#structure)).

   For LAM-A2E:
   ```powershell
   python animations\parse_a2e.py path\to\lam_a2e_output.json `
     -o public\animations\my_clip_frames.json
   ```

   For A2F-3D (manual CSV export):
   ```powershell
   python animations\csv_converter.py path\to\animation_frames.csv `
     -o public\animations\my_clip_frames.json --fps 30
   ```

5. **Add a clip entry to your scene manifest.** Either edit
   [public/scene.json](public/scene.json) (or `public/scene2.json`) directly,
   or create a new manifest under `public/`. Example:

   ```json
   {
     "id": "my_new_line",
     "animation": "animations/my_clip_frames.json",
     "audio": "audio/my_audio.wav",
     "delayAfter": 0.5
   }
   ```

   These paths are relative to the manifest's own location (`public/`), so
   they resolve to `public/animations/...` and `public/audio/...` without
   needing a `public/` prefix inside the manifest itself.

6. **Point an avatar at the manifest** in [src/App.ts](src/App.ts):

   ```ts
   const avatar = new A2FAvatar(scene);
   await avatar.loadManifest(`${import.meta.env.BASE_URL}my_scene.json`);
   avatar.rootNode.position = new Vector3(x, y, z);
   avatar.rootNode.rotation = new Vector3(0, yaw, 0);
   avatar.rootNode.scaling  = new Vector3(175, 175, 175); // cm scene, m VRM
   ```

7. **Run the dev server and trigger playback.**

   ```powershell
   npm run dev
   ```

   The right-hand UI built in `App._createAvatarUI` has a **Play All** button
   (calls `playSequence()` on every avatar) and a **Stop** button
   (`stopAndReset()`).

### Path conventions used by the existing manifests

- VRMs live in `public/models/<race>/...`.
- Manifests (`scene.json`, `scene2.json`) live in `public/`.
- Final, servable animation JSONs live in `public/animations/`. The converter
  scripts and raw/intermediate output (`.csv`, non-final `.json`) stay in the
  top-level `animations/`, which isn't served.
- Audio files live in `public/audio/`.
- Everything above is served directly by Vite, both dev and production,
  because it's under `public/`.
- Manifest URLs are resolved relative to the served page root (Vite serves
  `dist/scene` content, so `../scene3.json` walks up to the project root
  manifest).

If you put assets elsewhere, just update the strings in the manifest — they
are plain URLs that get `fetch`ed.
