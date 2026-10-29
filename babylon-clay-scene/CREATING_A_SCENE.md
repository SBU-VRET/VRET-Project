# Creating a Scene — Walkthrough

How to add a new talking avatar (model + voice line + facial animation) to the
demo, end to end, using the tools that exist in this repo today.

**Scope note:** "scene" here means a *character manifest* (`scene.json`) — an
avatar, its idle behavior, and a list of clips it plays. It does **not**
cover editing the 3D environment itself (the room/street in `public/scene/`)
or placing new objects/props — that part of the pipeline isn't data-driven
yet (no schema, no editor), and the original BJSE source project for the
base environment was considered lost as of 10/26 — as of 10/28, we found it
and still need to figure out how to include it. If you just need to add
or change a character's dialogue/animation, you don't need any of that.

---

## 0. Prerequisites

```
cd babylon-clay-scene
npm install
npm run dev
```
Opens at `http://localhost:3000`. Keep this running — you'll reload it to
check your work as you go.

You'll also need:
- An NVIDIA GPU (CUDA) for the facial-animation step, **or** a Google
  account to run it on Colab instead (no GPU needed locally either way).
- A `.wav` voice line for your character — either reuse one already in
  `public/audio/`, or record/generate your own (see step 2).

---

## 1. Pick an avatar

Avatar files live in `public/models/`, sourced from the
[valid-vrm-avatars](https://github.com/TLTMedia/valid-vrm-avatars) library
(210 avatars across 7 ethnicities, see `docs/EXISTING_MODELS.md`). Pick one
`.vrm` file — e.g. `models/Black/Black_F_1_Busi.vrm`.

Two avatars (`AIAN_M_1_Busi.vrm`, `Asian_F_1_Busi.vrm`) are missing some
ARKit blendshapes including `jawOpen` — avoid those two for now.

---

## 2. Get a voice line (`.wav`)

Simplest option: reuse an existing clip from `public/audio/`.

To generate a new one, QwenTTS (`qwen.py`, voice cloning + TTS) exists in
`temp/qwenTTS/` but isn't wired into the tracked pipeline yet — see
`docs/QWENTTS.md` for how it works if you want to use it anyway. Otherwise,
any clean speech `.wav` works as input to the next step.

---

## 3. Generate facial animation from the audio

This turns your `.wav` into a JSON file of per-frame ARKit-52 blendshape
weights, using **LAM Audio2Expression** (the current preferred tool — see
`docs/AUDIO2FACE_VS_AUDIO2EXPRESSION.md`).

1. Open `animations/LAM_Audio2Expression_Colab.ipynb` in Google Colab (no
   local GPU needed) and run it top to bottom — it'll prompt you to upload
   your `.wav` (multiple at once is fine) and downloads a result JSON per
   clip.
2. Convert the downloaded JSON into the runtime format:
   ```
   python animations/parse_a2e.py path/to/downloaded.json -o public/animations/my_clip_frames.json
   ```

Full details, troubleshooting, and the tuning knobs tried so far (brow
movement, smoothing, etc.) are in `ANIMATION_PIPELINE.md`.

---

## 4. Put the audio where the manifest expects it

Copy your `.wav` into `public/audio/` if it isn't already there. Both the
converted animation JSON (from step 3) and the audio file need to live
under `public/` — anything fetched at runtime has to be there, or it won't
exist in a production build (see `README.md`).

---

## 5. Write or extend a scene manifest

A manifest is a JSON file like `public/scene.json`:

```json
{
  "avatar": "models/Black/Black_F_1_Busi.vrm",
  "idle": {
    "blinkIntervalMin": 2.0,
    "blinkIntervalMax": 5.0,
    "blinkDuration": 0.15,
    "breathCycleSpeed": 0.4,
    "breathJawAmount": 0.1
  },
  "clips": [
    {
      "id": "my_clip",
      "animation": "animations/my_clip_frames.json",
      "audio": "audio/my_clip.wav",
      "delayAfter": 0.5
    }
  ]
}
```

- `avatar` — path to the `.vrm` from step 1.
- `idle` — optional; omit fields to use the defaults shown above.
  Head sway and eye-gaze saccades also run automatically during idle (and
  during speech) but aren't configurable here yet — they're hardcoded in
  `A2FAvatar.js`.
- `clips` — one entry per line, played in order. `animation`/`audio` paths
  are relative to `public/`. Set `delayAfter: 0` on the last clip.

Either extend an existing manifest's `clips` array, or create a new file
(e.g. `public/scene3.json`) for a brand-new character.

Full schema reference (including what each idle field does) is in
`ANIMATION_PIPELINE.md`, section 2.

---

## 6. Load it into the scene

**This part isn't data-driven yet** — a new manifest file isn't picked up
automatically. In `babylon-clay-scene/src/App.ts`, inside `_handleLoad()`,
each character is loaded explicitly:

```ts
const myCharacter = new A2FAvatar(this.scene);
await myCharacter.loadManifest(`${import.meta.env.BASE_URL}scene3.json`);

if (myCharacter.rootNode) {
  myCharacter.rootNode.position = new Vector3(/* x, y, z */);
  myCharacter.rootNode.rotation = new Vector3(0, /* yaw */, 0);
  myCharacter.rootNode.scaling = new Vector3(175, 175, 175);
}
```

Pick a position/rotation that doesn't overlap the existing avatars (see the
values already used for `avatar`/`secondCharacter` nearby in the same
function for reference points in the scene). Wire it into
`_createAvatarUI`'s Play All / Stop buttons alongside the others if you
want it included in those.

---

## 7. Test it

With `npm run dev` still running, reload `http://localhost:3000` and hit
**Play All**. Check the browser console for `[A2FAvatar]` warnings (missing
mesh, missing bones, etc.) if anything looks wrong.

---

## Known gaps (as of 2026-10-28)

- No schema/tooling yet for placing new environment objects (`.glb` props)
  — only avatars are positioned, and only via hardcoded `App.ts` code.
- No validation for manifests, models, animation JSON, or audio before they
  hit the runtime — a malformed file fails silently or late.
- The base environment (`public/scene/example.babylon`) isn't editable
  through this workflow — see the scope note at the top.
