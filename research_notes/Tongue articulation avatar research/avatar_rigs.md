# Open-Source / Freely-Usable Avatar Rigs with Real Tongue-Position Blendshapes

Scope: avatar/character rigs that have (a) actual tongue geometry and (b) blendshapes/morph
targets that move the tongue to specific positions (touching alveolar ridge, back of teeth,
roof of mouth) — needed for consonants L, T, D, N — not just a tongue mesh that only
protrudes/retracts.

## Does VRoid Studio's VRM export include a tongue mesh with blendshapes beyond protrusion?

### Takeaway
VRoid Studio exports a tongue (it is affected by the `TongueOut` ARKit-style blendshape and by
`MouthLeft`/`MouthRight` for sideways rotation), but there is no evidence of built-in blendshapes
for tongue-tip placement against the alveolar ridge or teeth. The community "Perfect Sync" /
tongue-animation ecosystem around VRoid only adds more *protrusion-family* shapes (tongue out,
side-lick, lip-lick) — it does not add alveolar/teeth-contact shapes.

### Cited Findings
- A VMagicMirror/VmmJekyll "Perfect Sync" tips page instructs users to leave `TongueOut` alone because lengthening it makes the tongue "easier to penetrate the lips," and to fix tongue clipping (tongue rotating too far sideways and penetrating the cheek) by weakening the `MouthLeft`/`MouthRight` shapes that drive the tongue's sideways rotation — confirming VRoid's tongue is controlled only by `TongueOut` + mouth-corner shapes, not dedicated position shapes. — [hinzka blog, "Perfect Sync" tips](https://hinzka.hatenablog.com/entry/2021/05/08/105733)
- "Perfect Sync" (coined ~late 2020 by developer hinzka) is the process of adding the 52 ARKit blendshapes to a VRoid model; the blendshape set itself is entirely up to the modeler/tool, and ARKit's set only contains `tongueOut`. — [Warudo docs, 3D primer](https://docs.warudo.app/docs/tutorials/3d-primer)
- A paid BOOTH.pm kit ("VRChat VRoid 表情拡張アニメーションキット / Expression Animation Kit hz1") adds four tongue animations to a VRoid-exported VRM: tongue-out, side-lick (`Tongue_Side_L`/`Tongue_Side_R`), lick-up, and lip-lick — all protrusion-family motions, not alveolar/teeth contact. It only works on VRM exported from the official VRoid Studio, requires manually adding the blendshapes (via the paid "HANA_Tool" Unity asset) to the model first, and the author explicitly states no support is provided. — [BOOTH item 4229435](https://booth.pm/en/items/4229435)
- A HANA_Tool product listing (used to copy/add ARKit-style blendshapes onto VRoid/VRM models in Unity) exists in versions for both VRM 0.x and VRM 1.0, implying tongue blendshapes are not natively present and must be added per-model. — [BOOTH item 2437978](https://booth.pm/en/items/2437978), [BOOTH item 4607357](https://booth.pm/en/items/4607357)
- No tongue preset appears in the official VRM spec's expression lists found in documentation for `blendShapeMaster` (VRM 0.x) or the VRM 1.0 expression presets (which cover emotions, visemes `aa/ih/ou/ee/oh`, blink, and look-direction) — [vrm-c/vrm-specification (0.0 README)](https://github.com/vrm-c/vrm-specification/blob/master/specification/0.0/README.ja.md), [vrm.dev blendshape setup docs](https://vrm.dev/en/univrm/blendshape/blendshape_setup/)

### Inferences
- VRoid/VRM tongue rigging in the wild is built entirely around the ARKit 52-shape "Perfect Sync" convention, which caps out at `tongueOut`. Any extra tongue shapes the community adds (BOOTH kits) are custom, non-standard, model-specific shape keys layered on by hand/paid tools — they target camera-pleasing "tongue out/side-lick" VTuber expressions, not articulatory accuracy for consonants.
- Because VRM tongue blendshapes are informal/non-spec, building true alveolar-contact shapes on a VRoid model would require sculpting new custom morph targets yourself in Blender/VRoid Studio (geometrically feasible, since the tongue mesh exists) rather than finding a ready-made asset.

### Gaps
- Could not confirm from documentation whether VRoid Studio's tongue mesh has enough topology/resolution near the tip to sculpt a clean alveolar-contact shape — would need hands-on inspection of an exported VRM's tongue mesh.
- No source directly addresses VRM 1.0-specific tongue handling (search turned up mostly VRM 0.x material).

---

## Does Ready Player Me's avatar format include tongue blendshapes beyond ARKit's `tongueOut`?

### Takeaway
No. All evidence points to Ready Player Me avatars exposing exactly one tongue-related morph target, the ARKit `tongueOut`, delivered only when explicitly requested via the API's `morphTargets` query parameter. No alveolar/position-specific tongue shape was found in any RPM-related source.

### Cited Findings
- A third-party integration doc (AICO project) lists RPM/ARKit avatar morph targets and documents a tongue category containing a single target, `tongueOut` (range 0.0–1.0, "sticks the tongue out") — [AICO avatar blendshapes docs](https://boeni-industries.github.io/aico/subsystems/frontend/avatar-blendshapes)
- Ready Player Me's own API reference confirms morph targets are **not** included by default — they must be requested by adding a `?morphTargets=` parameter (e.g. `?morphTargets=ARKit`) to the avatar GET request, and the parameter accepts standard group names like `ARKit` or `Oculus Visemes`. — [RPM docs: Apple ARKit morph targets](https://docs.readyplayer.me/ready-player-me/api-reference/avatars/morph-targets/apple-arkit), [RPM forum guide: blendshapes/morph targets/shape keys](https://forum.readyplayer.me/t/guide-blendshapes-morph-targets-and-shape-keys/222)
- A Babylon.js forum thread notes RPM avatars commonly use `?morphTargets=ARKit,Oculus Visemes` and that RPM's naming convention (e.g. `mouthOpen`, `jawOpen`, `mouthSmile_L`) may need a mapping layer to drive from visemes — no tongue-position shape is mentioned among these. — [Babylon.js forum thread on morph-target facial animation](https://forum.babylonjs.com/t/implementing-morph-target-based-facial-animations-with-glb-models-in-swiftui-insights-from-babylon-js-experts/48462)

### Inferences
- Since ARKit's own 52-shape spec (the industry baseline RPM mirrors) only ever defined `tongueOut`, and RPM's morph targets are explicitly scoped to "standard groups" (ARKit / Oculus visemes), RPM has no path to a richer tongue rig without Ready Player Me adding non-standard custom shapes — which no source indicates they have done.
- RPM avatars are therefore in the same boat as "the thing we already have" per the task's skepticism note — confirmed, not just assumed.

### Gaps
- Could not directly fetch `docs.readyplayer.me` pages in this session (DNS/network error on WebFetch); findings rely on third-party documentation and forum quotations of RPM's docs rather than a direct read of the live RPM page. The core claim (ARKit set = `tongueOut` only) is still high-confidence since it is corroborated by ARKit's well-established spec and multiple independent secondary sources.

---

## Do any academic/open-source head-rig projects (MakeHuman, MB-Lab, FaceGen, university FACS/articulatory models) include real tongue articulation shapes?

### Takeaway
Yes — but the strongest real matches are academic **articulatory speech-synthesis** rigs (not game-avatar rigs), and they are generally not blendshape-driven, not in glTF/VRM, and not trivially convertible to Babylon.js. Among general-purpose character tools, MakeHuman/MPFB2 has a real tongue mesh with a dedicated "tongue" ARKit-style slider group but no evidence of alveolar-contact shapes; MB-Lab has a FACS-compatible facial rig with a morphable tongue in the main mesh but no documented tongue-position shape list; FaceGen explicitly discusses modeling tongue-to-teeth contact (e.g., the "th" phoneme) via its "target morph" mechanism, meaning the *capability* exists but no ready-made tongue-contact morph ships by default — you'd build it yourself.

### Cited Findings
- **MakeHuman/MPFB2:** The MakeHuman base mesh has a dedicated tongue helper (a block of named vertices, `helper-tongue`, used for weighting/deforming the tongue), and some facial bones are explicitly rigged to end on this tongue helper rather than the skin. — [MPFB rigging mesh assets docs](https://static.makehumancommunity.org/mpfb/docs/rigging_mesh_assets.html)
- MPFB 2.0.16 added a facial-control panel with one slider per ARKit face unit, grouped by region including a dedicated "tongue" group among brow/eye/cheek/jaw/mouth/nose/tongue — i.e., MakeHuman's tongue control is explicitly ARKit-scoped (so, by the same logic as RPM above, likely limited to protrusion-type motion, not alveolar contact). — [MPFB 2.0.16 release notes](https://static.makehumancommunity.org/mpfb/releases/release_2016.html)
- MakeHuman/MPFB is licensed such that morph target files you create yourself carry no license by default, while derivatives of the shipped base targets inherit those targets' license — MakeHuman's base assets are released under CC0/AGPL depending on component, making it one of the most research-friendly options license-wise (confirm current license file on release before use). — [MHBlenderTools: MakeTarget docs](https://static.makehumancommunity.org/oldsite/documentation/mhblendertools__maketarget.html)
- **MB-Lab:** The project's own wiki states its character mesh deliberately includes teeth, tongue, eyelashes, gums and eyes as part of the *main* mesh "in order to morph them" and export without fitting problems — confirming a genuine, morphable tongue mesh. — [animate1978/MB-Lab wiki](https://www.github.com/animate1978/MB-Lab/wiki)
- MB-Lab 1.7.5 (2020) added a FACS-compatible facial rig and a separate tongue shader. — [CGChannel: "Create free facially rigged CG characters with MB-Lab 1.7.5"](https://www.cgchannel.com/2020/08/create-free-facially-rigged-cg-characters-with-mb-lab-1-7-5)
- MB-Lab is released as free/open-source software (GPL-licensed, distributed as a Blender add-on) — license-compatible with a no-budget university project, though no source in this search confirmed a specific list of tongue-position shape names (vs. just "a morphable tongue exists").
- **FaceGen:** FaceGen's own morph-authoring manual uses tongue-to-teeth contact as its canonical example of when you need a "target morph" rather than a "delta morph": *"the 'th' phoneme where the tongue must touch the teeth"* requires a target morph because target morphs store absolute positions that stay correct regardless of face shape, whereas delta morphs apply uniform offsets that can't guarantee contact. — [FaceGen: Adding Morphs manual](https://facegen.com/man_add_morphs.htm)
- This confirms FaceGen's modeling framework *supports* building true tongue-contact position morphs (e.g., for "th", and by extension alveolar consonants), but FaceGen ships as a commercial modeling tool/SDK, not a pre-built avatar with such morphs already authored — a developer would have to create the `head_th.obj`-style target morph from a tongue-touching-teeth sculpt. — [FaceGen: Adding Morphs manual](https://facegen.com/man_add_morphs.htm)
- **Academic articulatory tongue models (closest true match to the ask):**
  - *Artimate* (Steiner & Ouni, 2012) is a 3D vocal-tract animation framework built specifically to animate tongue and teeth from articulatory data (electromagnetic articulography, EMA); the tongue/teeth are rigged with a Blender "pseudo-skeleton" (bones), not blendshapes, and the pipeline is explicitly built on open-source tools (Blender). — [arXiv:1203.3574](https://arxiv.com/abs/1203.3574)
  - Steiner et al. (2013) extended this to a full multimodal corpus where the static 3D tongue model (from volumetric MRI + dental scans) is driven directly by EMA data. — [arXiv:1310.8585](https://ar5iv.arxiv.org/html/1310.8585)
  - Hewer, Wuhrer, Steiner & Richmond, "A Multilinear Tongue Model Derived from Speech Related MRI Data of the Human Vocal Tract" (Computer Speech & Language, 2018) built a statistical multilinear tongue model from 3D MRI of 11 speakers that separates anatomical shape from speech-pose (articulatory) shape variation — this is a genuine, data-driven "tongue position" model, just not a hand-authored blendshape rig. The companion code (`mri-shape-tools`, used to derive the model) is MIT-licensed on GitHub. — [m2ci-msp/mri-shape-tools (GitHub, MIT license)](https://github.com/m2ci-msp/mri-shape-tools), [arXiv:1612.05005](https://www.arxiv.org/pdf/1612.05005)
  - ArtiSynth is a free, open-source (2-clause BSD-style license), Java-based biomechanical simulation platform for the vocal tract that includes a documented "Biomechanical Tongue Model" (946 nodes / 740 hexahedral elements) and a "Coupled Jaw-Tongue-Hyoid Model," distributed via the separate `artisynth_models` package (downloadable from GitHub or as a precompiled release). — [ArtiSynth](https://www.artisynth.org/), [ArtiSynth Demo index](https://www.artisynth.org/Demo), [ArtiSynth biomechanical tongue model page](https://artisynth.org/Demo/BiomechanicalTongueModel)
  - The University of Edinburgh's "Seeing Speech" project built a 2D-midsagittal head rig in Autodesk Maya with 13 tongue control points across the root/dorsum/front/blade/tip regions, driving jaw, tongue, lips, larynx, soft palate and uvula; lips/velum are explicitly blendshape-driven, but the page does not state the tongue itself uses blendshapes (likely joint/control-point driven instead), and gives no download/license info for the rig. — [Seeing Speech: Creating the Animations](https://seeingspeech.ac.uk/creating-the-animations)

### Inferences
- There is a real split in the research landscape: avatar/VTuber-oriented rigs (VRoid, RPM, MakeHuman's ARKit panel, MB-Lab) stay anchored to the ARKit 52-shape convention and so cap out at tongue protrusion; genuine alveolar/teeth-contact tongue modeling only shows up in **speech-science/articulatory research** tooling (Artimate, the Hewer MRI tongue model, ArtiSynth, Seeing Speech), which models the tongue via skeletal "pseudo-bones," statistical pose parameters, or biomechanical simulation nodes rather than glTF-style blendshapes.
- None of the articulatory research tools are glTF/VRM-native or designed for a game/WebXR engine; all would need a custom conversion/retargeting step (e.g., baking EMA- or simulation-driven tongue poses into glTF morph targets on your own mesh) to be usable in Babylon.js. This is a non-trivial engineering effort, not a drop-in asset.
- Given FaceGen's explicit statement that tongue-teeth contact needs an absolute-position "target morph," and that MakeHuman/MPFB's tongue helper mesh is editable, the most pragmatic low-budget path for a university project is likely: take an existing rigged tongue mesh with reasonable topology (MakeHuman/MPFB's `helper-tongue`, or MB-Lab's tongue mesh — both free/open-source) and hand-sculpt custom alveolar/teeth-contact shape keys yourselves in Blender, then export to glTF. This keeps you within CC0/GPL-style licensing and inside a Blender→glTF→Babylon.js pipeline you already control, rather than depending on an external "ready-made" rig that doesn't exist.

### Gaps
- Could not find a definitive, named list of MB-Lab's tongue-specific FACS shape keys (only confirmed that a FACS-compatible rig and a morphable tongue mesh both exist in the same release).
- Could not confirm licensing/download terms for the Seeing Speech 2D head rig, or whether its tongue control points are exposed as exportable blendshapes vs. rig-internal driven keys.
- Could not confirm whether the Hewer multilinear tongue model or Artimate ship an explicit open license for the *model/mesh data* itself (code tooling is MIT-licensed; data license unconfirmed) — would need to contact the authors (e.g., Alexander Hewer) or check the HAL/arXiv record's license field directly.

---

## Are there Blender add-ons or community "Perfect Sync" rigs that add tongue-position shapes beyond protrusion, and do people actually use them?

### Takeaway
Community VTuber/VRChat "Perfect Sync" tooling (VSeeFace, VRoid add-on kits, HANA_Tool) is built entirely around the ARKit 52-shape standard and stays within the protrusion/side-lick family — no evidence found of any community tongue rig that models alveolar-ridge or back-of-teeth contact. People do actively use these tools, but only for expressive/comedic tongue-out VTuber gimmicks, not articulatory speech accuracy.

### Cited Findings
- "Perfect Sync" (hinzka, ~2020) = adding the full 52 ARKit blendshapes to a VRoid/VRM model; VSeeFace supports Perfect Sync input via iFacialMocap/FaceMotion3D/VTube Studio/MeowFace, and VSeeFace's changelog mentions a blendshape-translation feature so models *without* Perfect Sync shapes can still receive translated tracking data — all scoped to the ARKit set (so `tongueOut` only). — [Warudo face-tracking docs](https://docs.warudo.app/docs/mocap/face-tracking), [emilianavt gist (VSeeFace developer)](https://gist.github.com/emilianavt/90bc0b73e2713276e6f630db09977eae)
- Multiple actively-sold BOOTH.pm "Face Tracking Addon" products exist for specific VRoid/VRM character models (e.g. "Manuka," "Kipfel," "Komano," "Mamehinata," "Chiffon") confirming an active cottage industry around adding/extending ARKit blendshapes to individual avatars — titles reviewed show no claims beyond standard tracking shapes. — [example BOOTH listing](https://booth.pm/en/items/5528309)
- A specifically tongue-themed BOOTH product, "話すとたまに舌が出る TongueSlip" ("the tongue sometimes pokes out while talking"), and "ぬるベロ" ("slippery tongue," a VRChat tongue gimmick with Modular Avatar support) both target comedic/physical tongue-out effects, not articulation. — [BOOTH TongueSlip](https://booth.pm/en/items/9064982), [BOOTH ぬるベロ](https://booth.pm/en/items/9100556)
- The VRoid "Expression Animation Kit hz1" tongue animations (tongue-out, side-lick L/R, lick-up, lip-lick) are explicitly built by hand-adding custom shape keys via the paid HANA_Tool, confirming these are bespoke per-model additions, not a reusable general rig. — [BOOTH item 4229435](https://booth.pm/en/items/4229435)

### Inferences
- This community ecosystem is optimized for camera-facing VTuber expressiveness (exaggerated tongue-out/side-lick reactions), not for phonetic/articulatory accuracy — it is not a source of alveolar/teeth-contact tongue shapes, confirming the task's skepticism prior.
- Because every one of these tools/kits layers custom shape keys onto a specific model by hand (via Unity tools like HANA_Tool or Blender), the *technique* (manually sculpting extra tongue shape keys onto an existing VRM/VRoid tongue mesh) is proven to work in practice and is accessible without paid software beyond Blender — reinforcing the "build it yourself on top of an existing free tongue mesh" path as the realistic option.

### Gaps
- Did not find any community source specifically discussing tongue-tip-to-palate or alveolar contact shapes, confirming this is genuinely unaddressed territory in the VTuber/VRChat rigging community, not just something this research missed.

---

## Bonus finding: MetaHuman (Unreal Engine) — the one mainstream rig with genuine alveolar/teeth-contact-capable tongue shapes

### Takeaway
Epic's MetaHuman facial rig is the strongest non-academic real find: it ships **18 named tongue curves** that go well beyond protrusion, including tip-specific up/down/left/right and a "press" shape, which together can represent the tongue tip contacting the alveolar ridge/teeth needed for L/T/D/N. However, it is an Unreal Engine-centric, FBX/Control-Rig-based pipeline, not glTF/VRM-native, so it is **not a drop-in Babylon.js asset** — converting it to clean glTF morph targets for Babylon.js would be a real engineering project of its own. Licensing was eased in June 2025 to permit non-Unreal-engine use, but it is governed by the Unreal Engine EULA, which this research could not fully confirm applies cleanly, with no fees at all, to a no-budget university research/WebXR use case (the authoritative `metahuman.com/en-US/license` page required login and could not be read directly).

### Cited Findings
- The MetaHuman standards documentation index lists 18 distinct tongue curves: `tongueIn`, `tongueOut`, `tonguePress`, `tongueRoll`, `tongueWide`, `tongueNarrow`, `tongueThick`, `tongueThin`, `tongueUp`, `tongueDown`, `tongueLeft`, `tongueRight`, `tongueBendUp`, `tongueBendDown`, `tongueTipUp`, `tongueTipDown`, `tongueTipLeft`, `tongueTipRight`. — [Epic MetaHuman Animator standards index](https://dev.epicgames.com/documentation/en-us/metahuman/mh-standards-docs/mha_index)
- `tongueRoll` corresponds to FACS AU100 ("tongue rolling the lateral edges... upwards into a tube shape"), confirming the rig follows a FACS-grounded, not just ARKit-limited, taxonomy. — [Epic docs: tongueRoll](https://dev.epicgames.com/documentation/metahuman/mh-standards-docs/tongueRoll)
- As of Unreal Engine 5.6 (~June 2025), Epic changed MetaHuman licensing so MetaHuman characters/animations are classified as "Non-Engine Products" usable in any game engine or DCC application — including commercial projects in Unity or Godot — without incurring Epic's 5% Unreal-game royalty, and MetaHumans/clothing can now also be sold on marketplaces. — [CGChannel: "You can now sell MetaHumans, or use them in Unity or Godot"](https://www.cgchannel.com/2025/06/you-can-now-sell-metahumans-or-use-them-in-unity-or-godot/), [Digital Production: "MetaHumans Graduate"](https://digitalproduction.com/2025/06/05/metahumans-graduate-ready-for-unity-godot-and-the-fab-cash-register/)
- The free tier follows the standard Unreal Engine EULA: free for use/revenue under $1M/year; above that, a studio needs an Unreal Engine seat license (reported at $1,850/year, unconfirmed on Epic's own pages in this search). — [Digital Production article](https://digitalproduction.com/2025/06/05/metahumans-graduate-ready-for-unity-godot-and-the-fab-cash-register/)
- Epic's FAQ (as quoted secondhand in a Reddit/forum thread, not independently verified against Epic's own page) states no royalty applies to use of MetaHuman characters/animation "as linear media output or at runtime in games (or other interactive applications)" in non-Unreal engines. — [r/Unity3D thread via redlib mirror](https://redlib.hbubli.cc/r/Unity3D/comments/1l2kfiy/metahumans_in_unity)

### Inferences
- A no-budget university VR research project (well under $1M/year revenue, non-commercial) would very likely qualify for free use under the post-2025 terms, but this is an inference from secondary reporting, not a confirmed read of Epic's primary license text — the task's instruction to "note the license explicitly" cannot be fully satisfied here; treat as **likely compatible, unconfirmed**.
- Technically, MetaHuman tongue curves are driven through Unreal's "Control Rig"/skeletal + corrective-blendshape system, built from Unreal's internal DNA/rig format. Extracting just the tongue mesh + its 18 shape-key equivalents into clean glTF morph targets for Babylon.js is possible in principle (export FBX with blendshapes from Unreal/Maya, then convert to glTF, e.g. via Blender), but no source confirms anyone has published a turnkey MetaHuman→glTF tongue-rig conversion; this would be original integration work, not a found asset.

### Gaps
- Could not read Epic's authoritative `metahuman.com/en-US/license` or the MetaHuman EULA page directly (it redirected to an Epic Games login wall) — the exact academic/non-commercial terms, and any clause restricting rig/mesh extraction for use outside Unreal-authored pipelines, remain unconfirmed from a primary source. Recommend the user read `https://www.metahuman.com/en-US/license` and the Unreal Engine EULA directly (logged in) before relying on MetaHuman for this project.
- No source confirms whether MetaHuman's tongue mesh/shapes export cleanly via standard FBX/glTF export tools with morph targets intact, or whether this requires Unreal-specific plugins.

---

## Other candidate noted but not a real find: DAZ 3D "Tongue Control for Genesis 9" (Zev0)

Flagging this because it is the single most extensive *named* set of tongue-position dials found in this research, but it is a commercial DAZ Studio morph pack (not free, not glTF-native), so it is listed here as a lead rather than a confirmed solution.

- Includes shaping dials `TC Tongue Ridge Bottom`, `TC Tongue Ridge Top`, `TC Tongue Taper`, movement dials `TC Tongue Base Angle`, `TC Tongue Base Height`, `TC Tongue Base In-Out`, `TC Tongue Curl Up-Down All/Mid/Tip`, `TC Tongue Side-Side`, `TC Tongue Twist`, plus roll/width/thickness dials — combinations of `TC Tongue Curl Up-Down Tip` + `TC Tongue Base Height` + `TC Tongue Base In-Out` plausibly could position the tongue tip at the alveolar ridge, but the product page makes no explicit claim of this and provides no preset for it. — [DAZ 3D: Tongue Control for Genesis 9](https://hpcl.daz3d.com/tongue-control-for-genesis-9)
- Price: $17.99, requires "Genesis 9 Starter Essentials"; an optional $35 "Interactive License" is sold separately, which strongly suggests the base Daz Standard License does not clear broader (e.g., external engine/redistribution) use — **this needs explicit verification against Daz's licensing page** before use in a research project; the product page itself does not state export/external-engine terms. — [DAZ 3D: Tongue Control for Genesis 9](https://hpcl.daz3d.com/tongue-control-for-genesis-9)
- Genesis 9/Daz figures are not natively glTF/VRM; conversion would require a Daz-to-Blender bridge (e.g. Diffeomorphic) and a glTF export step, with no guarantee all ~29 tongue morphs survive as clean glTF morph targets.

### Gaps
- Did not fetch Daz's general licensing page (`/daz-licenses`) to confirm terms for exporting morphs/mesh to an external, non-Daz, non-commercial research application; this is required before treating this as usable.

---

## Overall synthesis for the report writer

1. **No free, ready-to-use VRM/glTF avatar was found that ships with alveolar/teeth-contact tongue blendshapes out of the box.** VRoid, Ready Player Me, and the entire ARKit/"Perfect Sync" VTuber ecosystem are all confirmed to cap out at `tongueOut` (plus informal side-lick extensions in VRoid community kits) — this validates the task's skepticism.
2. **The closest real, non-academic match is Epic's MetaHuman rig** (18 tongue curves including tip up/down/left/right and "press"), now licensable outside Unreal Engine as of mid-2025 — but it requires a non-trivial FBX/DNA→glTF conversion pipeline to reach Babylon.js, and its exact licensing terms for a no-budget academic project could not be fully verified from a primary source in this session.
3. **Academic articulatory-speech rigs** (Artimate, the Hewer MRI-derived multilinear tongue model, ArtiSynth's biomechanical tongue model, Edinburgh's Seeing Speech rig) are the only places where tongue models are built from real articulatory data capable of alveolar contact — but none are blendshape/glTF-based, none are built for a game engine, and licensing for the model *data* (vs. tooling code) is often unconfirmed or unaddressed.
4. **The most realistic, lowest-risk, license-clean path for a no-budget university project** is likely to take a free/open character base that already has a genuine, separately-weighted tongue mesh — MakeHuman/MPFB2 (its `helper-tongue` geometry, CC0/AGPL-style licensing) or MB-Lab (GPL, FACS-compatible rig, tongue in main mesh) — and hand-author custom alveolar/teeth-contact shape keys in Blender, then export to glTF for Babylon.js. This mirrors exactly what the VRoid/VTuber community already does informally (hand-adding shape keys via Blender/Unity tools) to get beyond the ARKit baseline, just aimed at articulatory accuracy instead of expressiveness. A DAZ Genesis 9 + "Tongue Control for Genesis 9" ($17.99, license terms unverified) is a secondary commercial option with the most granular named tongue dials found, if the team has even a trivial budget and can confirm Daz's export licensing permits this use.
