# First Scene Demo — Framing Questions (VRE-29)

Professor asked us to nail down a specific scene we're aiming to create for the
first demo before building further. Before answering and coordinating with the
team, listen to the voice-line recordings on the shared Google Drive; they're
the clearest signal of what's already been recorded and what the scene needs
to work around.

**Still needs an answer or more information:**
- **Two distinct demos (per 10/2 meeting) — don't conflate them.** The **mock demo** (immediate, ASAP priority) is a deliberate workflow dry run: build end-to-end on top of last semester's existing `babylon-clay-scene`, content as bare as a "hi/bye" interaction, purely so the team fully understands the tool-chain before committing to the real build. This document's scene (full casting, softening menu, ambient crowd, etc.) is the **actual demo**, built afterward with that understanding in hand — it is not blocked on the mock demo, and the mock demo is not a scaled-down version of it.
- **Q7** — script isn't established yet.
- **Q9** — script hasn't been reviewed by a psychologist yet.
- **Q11** — duration isn't set; depends on a finalized script/voice-line runtime that doesn't exist yet.

## Narrative & therapeutic framing

1. What specific traumatic event/scenario is this scene recreating, and why this one?
   - **Answer:** A traffic stop where a cop aggressively pulls over an innocent Black driver (white cop, Black victim) on a residential street — mirroring last semester's scene, chosen because it reflects a common, real-world pattern of police encounters the project is built around.

2. What's the therapeutic goal of the scene — what should exposure to it accomplish?
   - **Answer:** Let the user confront the fear/anxiety of an unjust traffic stop in a controlled, repeatable setting so that response can be processed and desensitized over time, then hand off into guided debrief — not to relive the trauma for its own sake.

3. What content/triggers must be avoided or softened per clinical guidance? (coordinate with Jayden)
   - **Answer:** Build a softening menu — start the siren/police-car arrival and bystander-crowd hostility at a baseline level, not full intensity, since the scene still needs to be a genuinely traumatic experience for the user to work through. The menu lets a clinician soften either trigger further when a session calls for it. An on-site clinician to intervene directly (pause, de-escalate, stop the scene) is nice to include if we can swing it for the first demo, but may have to be deferred.

4. How does this scene hand off into the therapeutic follow-up portion?
   - **Answer:** The scene ends when the driver is made to step out of the car with hands up, fades to a black screen, then hands off into the separate therapeutic/debrief portion.

## Actors & characters

5. Who are the actors — how many characters are needed, and what role does each play (victim, bystander, aggressor, guide, etc.)?
   - **Answer:** Two actors — a Black victim (the user, first-person) and a white male cop (aggressor). A background bystander crowd is optional, not yet decided.

6. Which existing avatar/VRM models can be reused vs. need to be built new?
   - **Answer:** Pick a Black-male avatar for the user and a white-male avatar for the cop from the existing valid-vrm-avatars library — no new character builds needed for the first demo.

## Script & dialogue

7. What is the script?
   - **Answer:** No finalized written script yet — the existing Drive voice-line recordings (`output_customvoice#` files) are the working script until a clean written version is compiled.

8. Is the dialogue linear, or does it need to branch (choice-based)?
   - **Answer:** Linear for the first demo — branching is possible in the future.

9. Has the script been reviewed by a psychologist before we record voice lines?
   - **Answer:** Not yet — this needs to happen before the first demo's lines are finalized; route it through Jayden's psychologist contacts once a written script exists.

## Scene & environment

10. What is the scene — what environment/location is it set in, existing asset or new build?
    - **Answer:** Clay Ave, a residential Bronx street. Definitely reusing last semester's scene concept, closing out on a stylized infinite, nighttime version of the same street for the ending beat.

11. What's the scene's intended duration?
    - **Answer:** Not established yet — depends on the final script/voice-line runtime, which isn't compiled yet.

## Objects

12. What objects are necessary in the scene?
    - **Answer:** Parked cars, trees, rowhouses, the police car (with siren audio), and optionally a bystander crowd — plus sound effects like window-knocking, and ambient noise like wind or city sounds. Per the 10/2 meeting, add basic environmental activity for realism: cars should move occasionally, and people should walk around occasionally.

13. Which objects are just background vs. need to be interactive?
    - **Answer:** Only the siren and bystander crowd need to be adjustable/interactive; everything else (cars, trees, buildings) is static background.

## Technical

14. What does this scene need to capture in `scene_XX.json` for Amanda/Coco's automation to consume?
    - **Answer:** The standard avatar/audio/animation fields, plus placeholder fields for trigger intensity (siren volume, crowd aggression level) so the schema doesn't need to change later if the control panel gets built.

15. What device/platform are we targeting for this demo (Quest 3/3s via Babylon.js)?
    - **Answer:** Meta Quest 3/3s via Babylon.js/WebXR — already the team's confirmed deployment target, nothing scene-specific to decide here.

## Scope

16. What's in scope for this first demo vs. deferred to a later iteration?
    - **Answer:** In scope: the linear traffic-stop scene with fixed character setup, audio-synced dialogue, the fade-to-black ending, and a pre-session menu to soften the siren/bystander-crowd triggers. Nice to have if time allows: a clinician present on-site. Deferred: branching dialogue and bystander-crowd dynamics as their own interactive object.

---
