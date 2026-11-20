# VRMA Clip Viewer

Browse, review and shortlist the 2,548 CMU motion-capture `.vrma` clips for idle (and other body) animation, on our own avatars. Ported from the old TLTMedia repo's `vrmaAll.html`, with search, per-clip stats, keep/maybe/reject marks, and contact-sheet screenshots.

## Setup (once)

The clips are 698 MB, so they're gitignored. Copy them into `tools/vrma-viewer/vrma/`, from either:
- the old repo checkout: `VRET-Old/vrma/*.vrma`, or
- GitHub: [TLTMedia/VRET](https://github.com/TLTMedia/VRET) → `vrma/`.

**Then repair them (required, about 1 min):**
```
node fix_vrma_bones.mjs
```
The old batch conversion wrote a broken bone map into every clip:
- The head pointed at an empty joint, so the head never moved.
- In 408 clips the right arm was shifted one joint up, so the shoulder drove the upper arm, and so on, and the arm looked stuck.

The script rebuilds the map from the CMU joint names, which are correct in every file, and folds CMU's extra neck joint into the VRM neck. It's safe to run twice: already-fixed clips are skipped. The originals in the old repo and on GitHub are still broken.

You need Node 22+. There is nothing to `npm install`. Babylon.js and the VRM loader come from a CDN, so the viewer needs internet.

## Run

```
cd tools/vrma-viewer
node serve.mjs
```
Open **http://localhost:3600**.

- **Left panel:** search by id or description (e.g. `wait`, `stand`, `140_`), and filter by category or by your marks. The list is sorted by idle score; lower is a better idle.
- **Avatar dropdown:** lists every `.vrm` in `babylon-clay-scene/public/models/`.
- **Keys:**
  - ↑/↓ or J/K: previous/next clip
  - Space: pause
  - Scrub bar: step through by hand
  - F / S: front/side view (the camera turns to face the character)
  - 1/2/3: keep / maybe / reject
- **Notes:** type in the note box and press Enter.
- **Marks:** saved to `verdicts.json` in this folder, so they can be committed or shared. Export gives you a copy.

## Reviewing clips without watching each one

**1. Rank every clip by the numbers (about 12s for all 2,548):**
```
node review_vrma.mjs
```
This writes `review.json` (the viewer reads it) and `review.csv` (open in Excel). For each clip it measures, straight from the bone tracks:
- duration
- drift / distance walked
- hips height
- knee bend
- turning
- angular speed (whole body, arms, legs, torso)
- how much the pose changes
- how cleanly the end loops back to the start

Each clip then gets a category (`idle candidate`, `locomotion`, `sit/crouch`, `static`, `other`), flags explaining why, and an idle score. Distances are in leg lengths, so subjects of different sizes compare fairly.

The numbers can't tell what the hands are doing. "Drink soda" and "standing" look alike to them, and some CMU labels are wrong: both clips labeled "Idle" are crouched ready stances. That's what step 2 is for.

**2. Contact sheets: 6 frames per clip in one PNG (needs `serve.mjs` running and Chrome or Edge):**
```
node snap_clips.mjs --top 30                    # top 30 idle candidates
node snap_clips.mjs --ids 139_02,113_21         # specific clips
node snap_clips.mjs --ids 139_02 --view side    # side view
```
PNGs go to `sheets/` (gitignored). They're fast to skim yourself, and Claude can read them directly, which is how the first pass below was done. You can also open one in the browser at `http://localhost:3600/?sheet=139_02`.

## First pass (11/19, from the contact sheets on Black_F_1_Busi)

Reviewed before the bone-map repair, then rechecked: the head now moves in all of these, and `77_02` changed verdict.

| Clip | CMU label | Verdict |
|---|---|---|
| `139_02` | Shifting Weight | **Best idle so far.** Relaxed, arms at sides, very subtle sway, stays in place. |
| `113_21` | Standing Still | **Good, livelier idle.** Relaxed stance, head tilts and looks down, small hand fidgets. |
| `113_16` | Shrug | Usable as a short idle variation (5.8s). Mostly a head tilt, subtle. |
| `111_28` | Standing still | Maybe. Cycles through hands-on-hips and hands-clasped poses. Reads as "impatient", which might suit a bystander. |
| `18_08`, `19_08` | conversation, explain with hand gestures | Not idles, but **candidates for body motion while speaking** (19_08 gestures throughout; 18_08 mostly still with one big gesture). |
| `77_02` | standing | **Good plain standing idle** after the bone-map repair. Before the fix it looked like a reject: its right arm was one of the 408 shifted ones and stuck out stiffly. |
| `140_06`, `140_07` | Idle | Reject. Crouched sports "ready" stance, despite the label. |
| `137_28`, `137_41`, `141_20` | Normal Wait / Strong Man Wait / Waiting | Reject for a static idle. They walk around, turn and sway. |

Most other high scorers are prop actions (drinking, eating, sewing) and aren't usable.

**Not checked yet:**
- Whether these clips work through `A2FAvatar.applyVRMA()` in the real scene. That function maps bones by node name, while this viewer uses the VRM loader's humanoid mapping, which is how the old demo did it.
- Blending between clips: the transition-snapping bug Carlos is looking at.
