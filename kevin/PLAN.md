# Kevin Chen — Plan

**Track:** Unreal/Babylon.js compatibility, VR device integration
**Time budget:** VIP 395, 1 credit = 3 hrs/week (1 meeting, 1 independent work, 1 research)

## Role (from kickoff slides)

**Tasks**
- Learn Babylon.js documentation
- Learn Unreal Engine XR and AI system documentation
- Ensure Babylon.js and Unreal Engine feature compatibility
- Create a Blueprint Struct in Unreal to match keys of scene JSON files, using the JSON Utilities Plugin
- Integrate the project onto a VR device
- Work directly with KPC clinicians and clients to understand user needs
- *(Next semester)* Design behavior trees for NPCs, automated based on scene JSON
- *(Next semester)* Design Smart Objects for scene interactivity

**Realistic Achievement:** a deployable Babylon VR experience on Meta Quest 3/3s.

**Collaboration:** support VR implementation for controllers; with Coco and Amanda, integrate their JSON file automation into the Blueprint Struct in Unreal Engine.

**Engine target (resolved):** Babylon.js + WebXR is the confirmed deployment pipeline — that's what actually ships to the Quest device. Unreal Engine (Blueprint Struct, behavior trees, Smart Objects) is upstream content-authoring tooling that feeds into that pipeline, not a competing runtime, so none of this work is blocked by engine ambiguity. If Unreal-authored behavior data can't be exported into the Babylon.js pipeline cleanly, that becomes the priority compatibility issue to raise with Fahim.

## Fall 2026 (Sept 22 – Dec 9)

| Done | Week of | Focus | Tasks |
|---|---|---|---|
| [ ] 9/21 | Environment setup | Set up local Unreal + Babylon dev environments; identify compatibility gaps between the two |
| [ ] 9/28 | Blueprint Struct start | Begin Blueprint Struct design in Unreal mirroring scene JSON keys; research/install the JSON Utilities Plugin |
| [ ] 10/5 | Blueprint Struct continues | Continue Blueprint Struct build; test loading a sample scene JSON into Unreal |
| [ ] 10/12 | Clinician input | Meet with KPC clinicians and clients to gather user-needs input (device comfort, controller needs, session length) |
| [ ] 10/19 | Deployment setup | Incorporate clinician/client feedback into the VR integration plan; begin Meta Quest 3/3s deployment pipeline setup |
| [ ] 10/26 | First device build | Get a first build running on the Quest device (even a minimal scene); debug controller input |
| [ ] 11/2 | Integration sync | Sync with Amanda/Coco on wiring their JSON automation output into the Blueprint Struct |
| [ ] 11/9 | Early research: behavior trees/NPC AI | Get a head start on Spring's behavior-tree scope — research Unreal's behavior tree/AI system options against what the scene JSON would need to drive |
| [ ] 11/16 | Stabilize | Stabilize the deployable build; fix VR-specific bugs (comfort, tracking, performance) |
| [ ] 11/23 | Thanksgiving (reduced) | Light week |
| [ ] 11/30 | Buffer / polish | Slack week for whatever slipped (device bugs, integration issues); otherwise continue Smart Objects research ahead of Spring |
| [ ] 12/7 | Fall wrap-up | Demo deployable Quest build; retro; scope Spring behavior trees/Smart Objects work |

**Fall exit criteria:** deployable Babylon VR build running on Meta Quest 3/3s, Blueprint Struct matching the scene JSON schema, clinician/client input captured.

## Winter Gap (Dec 10 – Jan 24)

No scheduled work.

## Spring 2027 (Jan 25 – May 8, dates estimated — confirm against registrar calendar)

| Done | Week of | Focus | Tasks |
|---|---|---|---|
| [ ] 1/25 | Behavior tree scoping | Turn the Fall research into a concrete scope: what "automated based on scene JSON" means for the first NPC type |
| [ ] 2/1 | Prototype | Begin behavior tree prototype for one NPC type |
| [ ] 2/8 | Test | Continue behavior tree work; test against sample scene JSON |
| [ ] 2/15 | Smart Objects scoping | Begin Smart Objects design for scene interactivity |
| [ ] 2/22 | Prototype | Prototype first Smart Object interaction |
| [ ] 3/1 | Integrate | Export/integrate behavior trees + Smart Objects data into the Babylon.js/WebXR build that actually deploys to Quest |
| [ ] 3/8 | Testing support | Support Jayden's test sessions — keep device/build stable during active patient testing (freeze non-critical changes) |
| [ ] 3/15 | Spring break (reduced) | Light/optional; buffer for device prep |
| [ ] 3/22 | Testing support continues | Continue supporting test sessions; hotfix any device issues found |
| [ ] 3/29 | Scale NPCs | Continue support; begin scaling behavior trees to additional NPC types |
| [ ] 4/5 | Scale Smart Objects | Scale Smart Objects to additional scenario types, supporting Amanda/Coco's automation-at-scale work |
| [ ] 4/12 | Pipeline integration test | Full pipeline test: automation → Unreal authoring → Babylon.js/WebXR → Quest deployment |
| [ ] 4/19 | Performance polish | Polish, performance profiling on device |
| [ ] 4/26 | Bug bash | Final bug bash; document the VR deployment process |
| [ ] 5/3 | Presentation prep | Final presentation prep — live Quest demo |

**Spring exit criteria:** behavior trees and Smart Objects integrated and scaled across scenario types, stable device performance through the testing window, full pipeline demoed live on Quest.

## Benchmarks / Definition of Done

### Fall 2026
- [ ] Blueprint Struct in Unreal matches the scene JSON schema keys
- [ ] Deployable Babylon.js/WebXR build running on Meta Quest 3/3s
- [ ] KPC clinician/client input captured and incorporated

### Spring 2027
- [ ] NPC behavior tree prototyped and integrated for at least one NPC type
- [ ] Smart Object prototyped and integrated for scene interactivity
- [ ] Behavior trees + Smart Objects scaled across multiple NPC/scenario types
- [ ] Stable device performance maintained through the active testing window

## Collaboration Checkpoints

- **Amanda/Coco:** Blueprint Struct ↔ JSON automation integration
- **Fahim:** Unreal/Babylon compatibility troubleshooting
- **Jayden:** device/session logistics during actual patient testing — build stability is critical here
