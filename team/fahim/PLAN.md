# Fahim Jawad — Plan

**Track:** Repository/build pipeline, technical coordination, validation tooling
**Time budget:** VIP 595 / CSE 523, 4 credits = 12 hrs/week (2 meeting, 4 independent work, 4 team coordination, 2 research)
## Role (from kickoff slides)

**Tasks**
- Audit the legacy TLTMedia/VRET repo for reusable prior-semester features/tests, then set up and structure the new SBU-VRET/VRET-Project repo as the project's actual home going forward (not a refactor-in-place — the team is building fresh in the new repo, cherry-picking from the old one rather than carrying its accumulated clutter over)
- Analyze and correct the facial animation/audio synchronization gap
- Coordinate and document team progress, tasks, and collaboration
- Own meeting notes and GitHub wiki/docs upkeep, and track open action items across subteams (absorbed from Carlos's floating role — he isn't currently carrying a standing assignment)
- Ensure accurate compilation and loading of scenes in Babylon.js using existing builds and characters, noting/adjusting for performance gaps
- Integrate idle animations for character models — evaluate Text to VRMA (outputs `.vrma` directly) vs. ARDY (NVIDIA research model; needs a `.npz`→BVH→VRMA conversion path via the official `bvh2vrma` tool, plus local GPU inference — lower priority, later work)
- Standardize the explicit software build process and how data is compiled
- Develop validation/testing for scene JSON files, character models, animations, and audio before they load into Babylon.js
- Create technical documentation/tutorials for setting up, building, testing, and running the VRET project locally
- *(Lower priority, later)* If ARDY is chosen over Text to VRMA for idle animation: write `npz_to_bvh.py` to convert ARDY's joint output into BVH, then feed that into the official `bvh2vrma` tool to get `.vrma` — not blocking current work

**Realistic Achievement:** a cleanly structured and documented new repo so future team members understand the pipeline and what was carried over from prior work; a reliable Babylon.js build/demo loading the existing scene, characters, audio, and animations correctly; a standardized, repeatable build and deployment workflow.

**Collaboration:** with Amanda & Coco, coordinate repo structure, branches, and scene JSON format so their automation integrates cleanly; with Kevin, integrate scene JSON/Babylon.js work with the Unreal/VR implementation and troubleshoot compatibility; with Jayden, integrate voice files with facial animation/lip-sync and test dialogue/animation sync; with the whole team, track GitHub progress, resolve merge/integration problems, document decisions, compile the team's work, take Friday meeting notes, and keep the GitHub wiki/docs current.

Given the largest time budget on the team, this role functions as technical lead — most weeks include a coordination pass across all four other subteams in addition to direct build work.

## Fall 2026 (Sept 22 – Dec 9)

**Standing weekly task (every week below, not restated per row):** take Friday meeting notes and post to Discord, keep the GitHub wiki/docs current, and track open action items across subteams.

| Done | Week of | Focus | Tasks |
|---|---|---|---|
| [ ] 9/21 | Full repo audit | Inventory existing branches on the legacy TLTMedia/VRET repo (Bennett & Jungu specifically) and prior-semester features/tests for anything worth porting over; read core Drive papers; set up local dev environment on the new SBU-VRET/VRET-Project repo |
| [ ] 9/28 | Pipeline docs + branch sync | Read remaining docs (LAM_Audio2Expression, valid-vrm-avatars, Audio2Face); walk Amanda/Coco through Bennett & Jungu branch findings before they scope new tooling; document the full tool-chain pipeline (diagram + stage-by-stage walkthrough: Audio2Face/LAM, Text to VRMA/ARDY, valid-vrm-avatars, Unreal/GLB handoff) in `docs/TECH_PIPELINE.md`; listen to the voice-line recordings on the shared Google Drive and give input on VRE-29's first-scene framing questions |
| [ ] 10/5 | Repo setup + bug isolation | Draft repo structure plan for the new SBU-VRET/VRET-Project repo (folder structure, branch strategy); begin diagnosing the facial animation/audio sync gap — reproduce it, isolate whether it's in Audio2Expression output, blend shape mapping, or Babylon.js playback; check whether the top-level `vrma/` folder has any existing `.vrma` content, and whether `bjse-plugin` is custom or vendored |
| [ ] 10/12 | Fix + baseline build | Fix or mitigate the sync issue; get a baseline Babylon.js scene loading reliably (existing characters/audio/animations) |
| [ ] 10/19 | Build standardization | Document the explicit build process; start the technical setup/build documentation draft |
| [ ] 10/26 | Validation tooling start | Begin validation tooling for scene JSON/models/animations/audio (schema validation before Babylon.js load); coordinate with Amanda/Coco so the validator matches their documented schema |
| [ ] 11/2 | Validation tooling | Continue validation tooling for scene JSON/models/animations/audio |
| [ ] 11/9 | Idle animation integration | Prototype + integrate idle animations via Text to VRMA (or note a fallback if incompatible); sync with Kevin on Unreal/Babylon compatibility issues found so far |
| [ ] 11/16 | Polish + repo hygiene | Continue idle animation polish; start team-wide GitHub cleanup (resolve stale branches, open PRs) |
| [ ] 11/23 | Thanksgiving (reduced) | Light week — finish GitHub cleanup carried over from 11/16; documentation catch-up |
| [ ] 11/30 | Finalize | Finalize the reliable Babylon.js demo build (scene + characters + audio + animations + idle); finalize validation tooling v1; publish setup/build/test/run documentation |
| [ ] 12/7 | Fall wrap-up | Compile the team's Fall progress into an end-of-semester report; retro; scope Spring priorities |

**Fall exit criteria:** new repo structured/documented, reliable Babylon.js build/demo, facial animation/audio sync fixed, validation tooling v1, published local setup documentation.

## Winter Gap (Dec 10 – Jan 24)

No scheduled work.

## Spring 2027 (Jan 25 – May 8, dates estimated — confirm against registrar calendar)

**Standing weekly task (every week below, not restated per row):** take Friday meeting notes and post to Discord, keep the GitHub wiki/docs current, and track open action items across subteams.

| Done | Week of | Focus | Tasks |
|---|---|---|---|
| [ ] 1/25 | Resume | Confirm the build is still stable after the break; re-sync with all subteams on Spring priorities |
| [ ] 2/1 | Support integration | Support Amanda/Coco's authoring-tool integration into the main pipeline |
| [ ] 2/8 | Harden for testing + Kevin support | Harden the build for real testing use (crash resilience, session logging) — Jayden's pilot sessions begin around now; support Kevin's behavior tree/Smart Object integration |
| [ ] 2/15 | Continue hardening | Continue hardening; add session/data logging hooks if the psych team needs technical data capture during sessions |
| [ ] 2/22 | Testing support | Support first test session batches technically (on-call for build issues — top priority this week); merge/integration coordination as time allows; non-critical independent/research work deferred |
| [ ] 3/1 | Testing support | Continue technical support during testing; keep validation tooling current as scene variants grow (choice-based storylines, multiple scenarios) |
| [ ] 3/8 | Mid-semester audit | Repo/documentation audit — ensure authoring-tool-generated scenes still pass validation |
| [ ] 3/15 | Spring break (reduced) | Light week — docs catch-up |
| [ ] 3/22 | Testing support continues | Continue technical support for testing (on-call — top priority this week); non-critical independent/research work deferred |
| [ ] 3/29 | Continue scaling | Continue scaling; resolve integration bugs across automation → Unreal/Babylon → VR device pipeline |
| [ ] 4/5 | Full pipeline test | Full pipeline integration test (automation script → validated scene → Babylon/Unreal build → Quest deployment) |
| [ ] 4/12 | Deployment docs v2 | Performance/build polish; finalize standardized deployment workflow documentation v2 |
| [ ] 4/19 | Data export support | Support final technical needs for data (e.g., exporting session data for Jayden's analysis) |
| [ ] 4/26 | Continuity documentation | Final documentation pass — full setup/build/test/run/deploy guide for future VIP semesters; start pulling together whole-team results ahead of 5/3 |
| [ ] 5/3 | Presentation prep | Final presentation prep — technical demo, finish compiling whole-team results |

**Spring exit criteria:** build stable and supported through the full testing window, full pipeline integration verified end-to-end, continuity documentation published for the next semester's team.

## Benchmarks / Definition of Done

### Fall 2026
- [ ] New repo structured and documented (folders, branches, prior-semester context carried over where useful)
- [ ] Facial animation/audio sync gap diagnosed and fixed
- [ ] Reliable Babylon.js build/demo loading scene + characters + audio + animations
- [ ] Validation tooling v1 for scene JSON, models, animations, and audio
- [ ] Local setup/build/test/run documentation published

### Spring 2027
- [ ] Build hardened and stable through the full testing window
- [ ] Full pipeline integration verified end-to-end (automation → Babylon.js/WebXR → Quest)
- [ ] Continuity documentation published for the next VIP semester's team
- [ ] *(Stretch)* `npz_to_bvh.py` written and ARDY validated as a viable idle-animation path, if GPU access allows

## Collaboration Checkpoints

- **Amanda/Coco:** repo structure, branches, schema/validation alignment (weekly-ish, front-loaded in Fall)
- **Kevin:** Unreal/Babylon compatibility troubleshooting (ongoing)
- **Jayden:** facial animation/lip-sync testing against real voice files (ongoing, critical during Spring testing)
- **Whole team:** GitHub progress tracking, merge/integration resolution, decision documentation, Friday meeting notes, wiki upkeep, cross-team action-item tracking (continuous)
