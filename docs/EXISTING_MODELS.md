# Pre-Existing Models & Animations (from the old repo)

The old repo's `models/` and `vrma/` folders come from two completely separate, unrelated sources. Neither one ships with the other, so the character models don't come with their own built-in animations. They still connect, though: VRMA stores motion against VRM's standardized humanoid bone names rather than anything character-specific, and every valid-vrm-avatars model shares that same rig, so any of the CMU animations can play on any of our models with no per-character setup.

## Models

The character models come from [valid-vrm-avatars](https://github.com/TLTMedia/valid-vrm-avatars), VRM 1.0 conversions of Google and UCF's VALID library (Virtual Avatar Library for Inclusion and Diversity).

What VALID actually provides: 210 fully rigged avatars across seven ethnicities, each with 65 facial blend shapes. The `valid-vrm-avatars` conversion extends these with ARKit-52 blend shape wiring (done through a Blender cleanup script, `cleanFace.md` in the old repo), which is what lets our Audio2Face/LAM pipeline drive facial animation on them at all.

Pros:
- The avatars we're actually using are CC BY 4.0 licensed (per `valid-vrm-avatars`' own README), free to use with attribution. The original VALID dataset itself is MIT, but that's not the license on the `.vrm` files we pull from — this derivative conversion is CC BY 4.0.
- 210 avatars across 7 ethnicities, already VRM 1.0 and already wired for ARKit-52, so no custom modeling or rigging needed.
- Perceptually validated, not just visually assigned labels, so the race/gender read on each avatar is backed by an actual study.

Cons:
- The ARKit-52 wiring isn't native to VALID. It's a Blender cleanup step this project's old repo added on top, which means it's an extra conversion layer that could introduce its own mapping errors.
- That conversion isn't perfectly consistent across avatars. I compared teeth-mesh morph target names across 5 avatars (White, Asian, MENA, Black, Hispanic) and Hispanic's are missing a naming prefix the other 4 share, which silently breaks teeth animation on that one model (see `docs/FACIAL_ANIM_REGEN_NOTES.md`). All 234 avatars were added in a single batch commit, so this looks like an edge case in that one conversion pass rather than a one-off manual fix.

## VRMA Animations

The `.vrma` files come from the CMU Graphics Lab Motion Capture Database, identifiable by the `subject_trial` file naming (`01_01.vrma`, `104_51.vrma`, `137_19.vrma`).

The old repo already did the conversion: these files are already `.vrma`, not raw `.bvh`, so the BVH-to-VRMA retargeting step (same mechanism as Stage 7's `bvh2vrma` in `docs/TECH_PIPELINE.md`) has already happened. We'd be reusing finished output, not starting from CMU's raw motion capture data.

As covered above, these retarget onto any of our models through VRM's standardized humanoid bone names.

Costs:
- Free for research use. CMU's own terms do allow including it in commercially-sold products, but you can't resell the data directly, even in a converted form like ours, and publications are expected to credit the source.

Pros:
- Already converted and sitting in the old repo, 2,548 clips. Reusing it skips the BVH-generation step Stage 7's ARDY path still needs (the `npz_to_bvh.py` script that hasn't been written yet), since this is real motion capture, not something we'd need to synthesize.
- Large variety, likely more idle/body motion than the mock demo needs.

Cons:
- The file names are just `subject_trial` numbers and tell you nothing about the actual motion. To know what `122_66.vrma` even is, we have to look it up on CMU's own website/database by subject and trial number — there's no way to tell from the file itself.
- Generic motion capture, not built for our traffic-stop/police-interaction content. Fine for baseline idle motion, but probably has nothing scenario-specific like "hands on the wheel" or a police stance.

## Sources
- [valid-vrm-avatars](https://github.com/TLTMedia/valid-vrm-avatars)
- [VALID: A perceptually validated Virtual Avatar Library for Inclusion and Diversity (Google Research)](https://research.google/blog/valid-a-perceptually-validated-virtual-avatar-library-for-inclusion-and-diversity/)
- [VALID repo (UCF XRT Lab)](https://github.com/xrtlab/Validated-Avatar-Library-for-Inclusion-and-Diversity---VALID)
- [CMU Graphics Lab Motion Capture Database](http://mocap.cs.cmu.edu/)
