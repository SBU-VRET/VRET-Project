# VRET — Virtual Reality Exposure Therapy (VIP, 2026 Fall → 2027 Spring)

Two-semester team plan built from the Fall 2026 kickoff slides. This file is the
team-level plan; each person has their own weekly breakdown in their directory:

- [team/jayden/PLAN.md](team/jayden/PLAN.md) — Clinical liaison, scene therapy design, patient data
- [team/amanda/PLAN.md](team/amanda/PLAN.md) — Scene schema + automation tooling
- [team/coco/PLAN.md](team/coco/PLAN.md) — Scene schema + automation tooling
- [team/kevin/PLAN.md](team/kevin/PLAN.md) — Unreal/Babylon/VR device integration
- [team/fahim/PLAN.md](team/fahim/PLAN.md) — Repo, build pipeline, technical coordination, meeting notes/wiki upkeep
- [team/carlos/PLAN.md](team/carlos/PLAN.md) — Floating volunteer support (no standing assignment currently)

## Project Goal

- Recreate traumatic real-world scenarios in VR for exposure therapy
- Test the therapeutic tool on actual patients
- Gather qualitative and quantitative data from patients
- Automate the tools (compatible across many devices)

## Roster & Weekly Time Budget

Per University VIP policy: 3 hrs/week per credit.

| Person | Course/Credits | Hrs/wk | Split |
|---|---|---|---|
| Jayden Shofolahan | VIP 395, 1 cr | 3 | 1 meeting, 1 independent, 1 research |
| Amanda Chen | VIP 395, 1 cr | 3 | 1 meeting, 1 independent, 1 research |
| Coco Gao | VIP 395, 1 cr | 3 | 1 meeting, 1 independent, 1 research |
| Kevin Chen | VIP 395, 1 cr | 3 | 1 meeting, 1 independent, 1 research |
| Fahim Jawad | VIP 595 / CSE 523, 4 cr | 12 | 2 meeting, 4 independent, 4 coordination, 2 research |
| Carlos Deleon | Volunteer | 1–2 | 1 research, 1 task work (rotates by need) |

## Tools & Tech Stack

| Tool | Role |
|---|---|
| Unreal Engine | Upstream level/scene authoring tool feeding into Babylon.js — **not** the deployment runtime |
| Babylon.js + WebXR | **Confirmed deployment target.** Combines scene, environment, animation into the deployed VR unit, runs in-browser on-device |
| Blender 3D | Character build + animation, blend shapes for facial transitions |
| ARKit-52 | Facial expression naming scheme aligning animation with audio |
| NVIDIA Audio2Face-3D / LAM Audio2Expression | Blend shape weights from audio |
| QwenTTS | Offline character voice line generation |
| GitHub | File storage + build pipeline (audio, blendshapes, models, scene data). **Active repo: [SBU-VRET/VRET-Project](https://github.com/SBU-VRET/VRET-Project)** — fresh repo, not a fork of the legacy TLTMedia/VRET. Prior-semester work lives at TLTMedia/VRET and is being audited for reusable pieces (models, scenes, working scripts), but not carried over wholesale — see Fahim's 9/21 repo audit task. |
| [valid-vrm-avatars](https://github.com/TLTMedia/valid-vrm-avatars) | Pre-built VRM 1.0 avatar library (VALID dataset conversions, ARKit-52 blend shapes) — the actual source of character models, not built from scratch per-character |
| Text to VRMA / ARDY | Idle/body animation generation — two candidates (Fahim to validate). Text to VRMA outputs `.vrma` directly; ARDY (NVIDIA research model) needs a `.npz`→BVH→VRMA conversion path and local GPU inference — lower priority |

Full tool-by-tool input/output breakdown, including the exact converter scripts and format handoffs: [docs/TECH_PIPELINE.md](docs/TECH_PIPELINE.md).

**Integration flow:** Unreal Engine + Blender 3D (character models, blend shapes) →
Babylon.js ← Audio2Expression ← QwenTTS. Babylon.js/WebXR is what actually ships to
the Quest device; Unreal Engine's role is scene/behavior authoring that feeds into
that pipeline, not a separate runtime.

## How We Work Together

- Whole team + faculty advisor: **Fri 3:30–4:30 PM**, weekly, sets the week's agenda
- Async: Discord + email
- Scheduling: Timeful (link needs updating — flagged as open item below)
- Subteam syncs happen off the Friday slot, as needed (see each person's
  Collaboration section)

## Master Timeline

The original kickoff timeline (9/4 → 12/9) tracks Jayden's scene/clinical arc most
closely and is used here as the backbone for cross-team milestones — the other
subteams' weekly plans are paced against their own task lists, not this timeline.

### Fall 2026 (Sept 22 – Dec 9, 2026)

| Done | Weeks | Milestone |
|---|---|---|
| [ ] 9/21 – 10/4 | Onboarding: repo access, docs/papers read, psychologist outreach starts, repo audit, **IRB status confirmed with faculty advisor** |
| [ ] 10/5 – 10/25 | Core build: facial-animation/audio sync fix, automation script prototype, Blueprint Struct, therapeutic scene draft |
| [ ] 10/26 – 11/15 | Integration: KPC clinician input, validation tooling, first Quest deployment |
| [ ] 11/16 – 12/7 | Stabilize + wrap: Thanksgiving week is reduced-load; finalize Fall deliverables, retro, scope Spring |

**Fall exit criteria:** reliable Babylon.js build loading the existing scene/characters/audio/animations, documented schema + validation tooling, a working automation script slice, a deployable Quest 3/3s build, and a finalized therapeutic scene draft reviewed by psychologists.

### Winter Gap (Dec 10, 2026 – Jan 24, 2027)

No scheduled work. Optional/self-paced: finish any outstanding literature review or documentation. This gap is intentionally excluded from the weekly plans.

### Spring 2027 (Jan 25 – May 8, 2027)

*Dates are estimated from SBU's typical spring calendar — confirm against the actual registrar calendar once published and adjust the week tables if it shifts.*

| Done | Weeks | Milestone |
|---|---|---|
| [ ] 1/25 – 2/8 | Resume, confirm IRB/ethics clearance, authoring tool + behavior-tree work begins |
| [ ] 2/9 – 3/1 | Recruit test subjects, pilot test session(s), protocol refinement |
| [ ] 3/2 – 3/22 | Main testing window (target n=10), spring break falls in this range (assumed ~3/15 — confirm and adjust) |
| [ ] 3/23 – 4/12 | Finish remaining sessions, begin qual/quant data analysis, automation-at-scale |
| [ ] 4/13 – 5/8 | Finalize data analysis, polish/scale pipeline, final presentation prep |

**Spring exit criteria:** completed test sessions with real subjects (n≈10), qualitative + quantitative data analyzed (interviews + Likert), authoring tool + at-scale automation working, NPC behavior trees/Smart Objects integrated, cross-device VR deployment stable.

## Benchmarks / Definition of Done

Team-wide targets — see each person's PLAN.md for the individual breakdown behind these.

### Fall 2026
- [ ] Reliable Babylon.js build loading the existing scene, characters, audio, and animations
- [ ] Documented + versioned scene schema (`scene_01.json` / `models.json`)
- [ ] Validation tooling in place for scene JSON, models, animations, and audio
- [ ] Working automation script slice (avatar list + dialogue script → scene skeleton)
- [ ] Deployable Quest 3/3s build via Babylon.js/WebXR
- [ ] Therapeutic-only scene draft reviewed by at least one psychologist
- [ ] IRB/ethics approval status confirmed with the faculty advisor (submitted if not already in progress)

### Spring 2027
- [ ] Test sessions completed with real subjects (target n≈10)
- [ ] Qualitative + quantitative data analyzed (interviews + Likert scale)
- [ ] Lightweight authoring tool functional end-to-end
- [ ] Automation extended to swap environments/avatars/dialogue at scale
- [ ] NPC behavior trees + Smart Objects integrated
- [ ] Stable VR deployment maintained through the full testing window

## Cross-Team Dependencies

- **Amanda/Coco → Fahim:** must sync on Bennett & Jungu branch history (legacy TLTMedia/VRET repo) before scoping new automation tooling, so work isn't duplicated or built against the wrong repo.
- **Amanda/Coco → Kevin:** JSON automation output must match the Blueprint Struct's expected keys.
- **Amanda/Coco → Jayden:** automation must wire voice/audio into the scene's `speak`/`lipSync` fields.
- **Kevin ↔ Fahim:** Babylon.js/Unreal Engine compatibility troubleshooting is joint work — Unreal's output has to cleanly feed Babylon.js.
- **Jayden ↔ Fahim:** facial animation/lip-sync must be tested against actual voice files together.

## Decisions Already Made

- **Deployment target: Babylon.js + WebXR, not Unreal Engine.** Unreal Engine is used upstream for scene/level authoring and (per Kevin's Spring tasks) NPC behavior tree/Smart Object design, but the pipeline that ships to the Quest device is Babylon.js/WebXR. Amanda/Coco's automation should target this pipeline directly (VRM/VRMA-compatible outputs into Babylon.js), and Kevin's Blueprint Struct/behavior tree work should be understood as content-authoring tooling that feeds that pipeline rather than a parallel runtime.
- **First scene demo is defined.** A traffic-stop exposure scene (white male cop, Black male victim/user) on Clay Ave, reusing last semester's scene concept — full answer set in [docs/FIRST_SCENE_FRAMING.md](docs/FIRST_SCENE_FRAMING.md) (VRE-29).
- **Environment/object `.glb` assets load individually at runtime, not pre-combined via the Babylon.js Editor.** Scenes change as a whole and the team wants future asset-level manipulation (picking which objects go into a scene), which needs each asset swappable independently. Affects Kevin's export workflow, Amanda/Coco's schema, and Fahim's `App.ts` runtime work — see `docs/TECH_PIPELINE.md` Stage 2.

## Risks & Open Items

1. **IRB / ethics approval status is unknown** — not mentioned in the kickoff deck, and not confirmed whether a prior-semester process already exists. **First action item for Jayden in Week 1 (9/21):** find the faculty advisor and get a definitive answer on status/lead time. This is the critical path for the entire Spring testing milestone — treat it as more urgent than the n=10 recruitment itself, since approval can take weeks to months and everything in Spring depends on it.
3. **Spring semester dates and spring break are estimated**, not confirmed against the registrar — revisit in January.
4. **n=10 realistic patient testing in Fall (per original 11/6 date) is very unlikely** without IRB clearance already in hand; this plan pushes actual testing to Spring and treats Fall's "test subject" language as recruitment/protocol prep instead.
5. **Meeting notes/wiki upkeep/cross-team action-item tracking moved from Carlos to Fahim** — Carlos isn't currently carrying a standing weekly assignment; Fahim absorbed this into his coordination hours (research hours trimmed to compensate, see Roster table). Revisit if Carlos's availability changes.
6. **First scene demo (VRE-29) still has open items**: the exposure-scene script isn't written yet (Jayden), it hasn't been reviewed by a psychologist (Jayden), and the scene's intended duration isn't set — depends on that script. See [docs/FIRST_SCENE_FRAMING.md](docs/FIRST_SCENE_FRAMING.md).
7. **Resolved: immediate priority is a basic demo, built on top of last semester's existing `babylon-clay-scene` demo, ASAP.** Even a bare "hi/bye" interaction is enough for now — the real priority is getting the full tool-chain stitched into one working pipeline. VRE-29's fully-cast traffic-stop scene is the eventual content target, not something this basic demo needs to wait on. Everyone has a part in this near-term push (see each person's current-week tasks).