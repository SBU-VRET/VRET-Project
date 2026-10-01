# Amanda Chen — Plan

**Track:** Scene schema documentation + automation tooling (paired with Coco)
**Time budget:** VIP 395, 1 credit = 3 hrs/week (1 meeting, 1 independent work, 1 research)

## Role (from kickoff slides, shared with Coco)

**Tasks**
- Document the current `scene_01.json` / `models.json` schema so the team has one clear reference
- Sync with Fahim on the Bennett & Jungu branches before building anything new, to avoid duplicate work
- Research whether there's a faster way to create models/environments in one prompt/instantaneously instead of building one by one
- Prototype one automation slice: a script that generates a valid `scene_XX.json` skeleton from just an avatar list + dialogue script
- Research ways to drive scenarios where the user's action could "change the storyline," like a choice-based game
- *(Semester 2)* Turn the script into a lightweight authoring tool so new scenarios don't require hand-editing JSON
- *(Semester 2)* Extend automation to swap environments, avatars, and dialogue at scale across scenario types

**Realistic Achievement:** a working script that generates a valid scene file from simple inputs (proof that one slice of automation works, not the full pipeline); a documented, versioned scene-file schema other teammates can build against.

**Collaboration:** with Fahim, align on repo structure and branch findings before scoping new tooling; with Jayden, wire voice/audio work into the scene timeline's `speak` and `lipSync` fields.

**Engine target (resolved):** Babylon.js + WebXR is the confirmed deployment pipeline. Unreal Engine is used upstream for scene authoring only, not the runtime — so the automation script should target VRM/VRMA-compatible outputs that feed Babylon.js directly.

### Suggested split with Coco

Both of you own the automation script together; this split is a starting point, not a fixed assignment — rebalance as needed:
- **Amanda leads:** schema documentation, Fahim/branch sync
- **Coco leads:** faster-generation research, choice-based storyline research

## Fall 2026 (Sept 22 – Dec 9)

| Done | Week of | Focus | Tasks |
|---|---|---|---|
| [ ] 9/21 | Onboarding | Get repo access; read VRET GitHub, LAM_Audio2Expression, valid-vrm-avatars repos; read the Drive papers |
| [ ] 9/28 | Schema docs start | Start documenting the `scene_01.json` / `models.json` schema; include [valid-vrm-avatars](https://github.com/TLTMedia/valid-vrm-avatars) as the actual avatar source and its `{Ethnicity}_{Sex}_{BodyType}_{Outfit}.vrm` naming convention (see `docs/TECH_PIPELINE.md` Stage 1); listen to the voice-line recordings on the shared Google Drive and give input on VRE-29's first-scene framing questions |
| [ ] 10/5 | Branch sync | Sync with Fahim on Bennett & Jungu branch history before scoping new tooling |
| [ ] 10/12 | Schema draft done | Finish first draft of schema documentation |
| [ ] 10/19 | Automation script scoping | With Coco, define automation script inputs/outputs (avatar list + dialogue script → `scene_XX.json` skeleton) |
| [ ] 10/26 | Script build | Continue script prototype, targeting VRM/VRMA output for the Babylon.js/WebXR pipeline |
| [ ] 11/2 | Script build + Jayden sync | Continue script build; sync with Jayden on wiring voice/audio into `speak`/`lipSync` fields |
| [ ] 11/9 | Testing | Test the automation script against at least one real scene; fix bugs |
| [ ] 11/16 | Wrap research | Wrap up choice-based storyline research into a feasibility write-up for Spring |
| [ ] 11/23 | Thanksgiving (reduced) | Light week, buffer/catch-up |
| [ ] 11/30 | Finalize | Finalize schema documentation v1 (versioned); finalize working automation script demo |
| [ ] 12/7 | Fall wrap-up | Demo script + schema doc to the team; retro; help scope Spring authoring-tool work |

**Fall exit criteria:** versioned schema doc published, working automation script generating a valid scene file from simple inputs.

## Winter Gap (Dec 10 – Jan 24)

No scheduled work.

## Spring 2027 (Jan 25 – May 8, dates estimated — confirm against registrar calendar)

| Done | Week of | Focus | Tasks |
|---|---|---|---|
| [ ] 1/25 | Authoring tool scoping | Gather requirements from the team for a lightweight authoring tool wrapping the script |
| [ ] 2/1 | Build starts | Begin authoring tool build (form/UI → generates scene JSON via the script) |
| [ ] 2/8 | Branching fields | Continue authoring tool; integrate choice-based storyline fields into the schema |
| [ ] 2/15 | Iterate | Iterate authoring tool based on team feedback |
| [ ] 2/22 | Scale: environments | Extend automation to swap environments at scale |
| [ ] 3/1 | Scale: avatars | Extend automation to swap avatars at scale |
| [ ] 3/8 | Scale: dialogue | Extend automation to swap dialogue/voice at scale; integration test with Jayden's therapeutic scene script |
| [ ] 3/15 | Spring break (reduced) | Light/optional week |
| [ ] 3/22 | Integration testing | Generate 2–3 full alternate scenarios end-to-end using the authoring tool |
| [ ] 3/29 | Bug fixes | Fix issues from integration testing; polish authoring tool UX |
| [ ] 4/5 | Unreal support | Support Kevin/Fahim on Blueprint Struct integration if automation targets that pipeline |
| [ ] 4/12 | Documentation | Write authoring tool usage guide and schema v2 doc |
| [ ] 4/19 | Scale testing | Stretch: scale testing across multiple scenario types |
| [ ] 4/26 | Polish | Final polish, bug bash |
| [ ] 5/3 | Presentation prep | Demo authoring tool + automation pipeline |

**Spring exit criteria:** authoring tool functional end-to-end, automation extended to swap environments/avatars/dialogue at scale, schema v2 documented.

## Benchmarks / Definition of Done

### Fall 2026
- [ ] Versioned `scene_01.json` / `models.json` schema documentation published
- [ ] Automation script generates a valid scene file from an avatar list + dialogue script
- [ ] Choice-based storyline mechanic researched and feasibility documented (Coco-led)

### Spring 2027
- [ ] Lightweight authoring tool functional end-to-end (UI → valid scene JSON)
- [ ] Automation extended to swap environments at scale
- [ ] Automation extended to swap avatars at scale
- [ ] Automation extended to swap dialogue/voice at scale
- [ ] Schema v2 documented

## Collaboration Checkpoints

- **Coco:** joint ownership of the automation script and authoring tool
- **Fahim:** repo structure, branch history, validation tooling alignment
- **Jayden:** `speak`/`lipSync` field integration
- **Kevin:** Blueprint Struct key alignment once engine target is confirmed
