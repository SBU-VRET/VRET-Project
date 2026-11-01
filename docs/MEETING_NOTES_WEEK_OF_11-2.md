# Meeting Notes — Week of 11/2

Summary covering Friday 10/30 through 11/5. Local/gitignored, meeting-prep reference, not a polished doc.

## Team updates (10/30 meeting)

**Kevin** — Setting up the Unreal project in Diversion (version control) for collaboration with Amanda and Coco. Next: texture buildings, reduce polygon counts.

**Coco** — Diagnosed and fixed Unreal install issues on her machine. Next: schedule time with Kevin and Amanda to finish the scene. She and Amanda are experimenting with settings to give the scene a nighttime appearance; research/testing ongoing. McKenna asked about potential future scenes — worth asking the team which additional scenarios to develop next.

**Amanda** — Downloaded and cloned the source project Bennett shared. Working with Kevin to explore collaborative editing through Diversion.

**Jayden** — Developing Likert-scale questions, focused on the importance of mental health generally rather than asking directly about the traumatic experience. Exploring questionnaire-based approaches to assess outcomes; discussed the Posttraumatic Growth Inventory (PTGI) as a way to assess perceived positive change following trauma.

**Carlos** — Made substantial progress testing the existing `.vrma` animation files; noticed possible rigging issues and started investigating. Next: explore Option B (ARDY + Text-to-VRMA) — already in the proposed workflow but not yet tried. **Role update (10/30):** Carlos now owns the "regular" VRMA body-animation track going forward (CMU library testing, chained playback, rigging issues, the transition-snapping bug) — idle animation specifically stays Fahim's call. See `team/fahim/PLAN.md` and `team/carlos/PLAN.md`.

## Confirmed: Amanda's cloned source project is the "found" BJSE project (11/1)

Pulled it down via git — it's on the `origin/amanda` branch (commit `af202c7`), and it's a full Unreal Engine project (`clay_ave_1/clay_ave_1.uproject`), not a literal BJSE project. So the editable source-of-truth for the Clay Ave scene is now Unreal, matching Kevin's 10/30 Diversion setup with Amanda/Coco — BJSE/`example.babylon` stays frozen as previously documented, but that's moot now that scene authoring lives in Unreal with `.glb` export into the Babylon.js mock demo. Updated `docs/PROJECT_GAPS.md`.

## Future scenes and assets

- Amanda/Coco should start thinking about what additional assets future scenarios would need.
- The project may eventually support multiple premade scenes beyond the current police traffic-stop demo — phobia-specific scenarios discussed as examples: a thunderstorm scenario (lightning/thunder effects), a spider/insect phobia scenario (creature assets).
- Supporting multiple scenarios is a substantially bigger asset/scene-development lift than the current single demo — not scoped yet.

## To-do for next meeting (11/6)

- **Raise McKenna's future-scenarios question with the whole team** (Fahim to bring it up) — which additional phobia-specific scenarios should the team actually develop next, given it's a substantially bigger asset/scene-development lift than the current single demo? No owner yet; needs a team-level decision before it becomes anyone's task.
- **Literature review presentation** — at Professor Ete's request, Jayden will lead a 15-20 minute presentation at the next Friday meeting, with support from Kevin. Covers literature directly relevant to the project plus informs outreach to clinicians/psychologists. Jayden picks which topics to prioritize given other commitments; candidate topics:
  - Eye tracking and the post-trauma experience (qualitative + quantitative measures, visuals welcome)
  - Eye tracking to assess improvement after VRET
  - VRET session count / scenario progression (how many sessions typically needed, repeat vs. progressing scenarios)

## Carried-over open items

- **Mouth/voice mismatch** — still unresolved, investigation paused.
- Black avatar eye-blink asymmetry — pending the Blender check (VRE-99/VRE-100, week of 11/2).
- VRMA transition-snapping bug — now explicitly Carlos's to investigate (see role update above), rigging issues also found this week.
- BJSE source project — resolved (11/1): it's the Unreal project on `origin/amanda` (see above). Not yet merged/integrated into the active build.
- `.glb` placement schema (`public/environment.json`) — built, review request posted to Kevin/Amanda/Coco on VRE-107 (11/1).
- New: whether/how to scope support for multiple future scenarios (phobia-specific scenes) — not yet an active task for anyone; Fahim to raise with the team at the 11/6 meeting (see To-do above).
