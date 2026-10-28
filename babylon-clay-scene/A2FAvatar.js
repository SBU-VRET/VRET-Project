/**
 * A2FAvatar — drop-in animated VRM avatar for Babylon.js
 *
 * Usage:
 *   import { A2FAvatar } from './A2FAvatar.js';
 *
 *   const avatar = new A2FAvatar(scene);
 *   await avatar.loadManifest('scene.json');
 *   await avatar.playSequence();           // plays all clips in order
 *   // or
 *   await avatar.playClip(0);             // play a single clip by index
 *   avatar.stopAndReset();
 */

// ─── Teeth morph targets driven alongside face shapes ────────────────────────
const TEETH_MAP = {
  jawOpen:     'h_teeth.t_MouthOpen_h',
  mouthFunnel: 'h_teeth.t_Shout_h',
  mouthClose:  'h_teeth.t_MPB_h',
};

// ─── State machine ───────────────────────────────────────────────────────────
const State = Object.freeze({
  UNLOADED:     'unloaded',
  IDLE:         'idle',
  PLAYING:      'playing',
  TRANSITIONING:'transitioning',
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function buildMorphMap(mesh) {
  const map = new Map();
  const mgr = mesh?.morphTargetManager;
  if (!mgr) return map;
  for (let i = 0; i < mgr.numTargets; i++) {
    const t = mgr.getTarget(i);
    map.set(t.name, t);
  }
  return map;
}

function lerp(a, b, t) {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

/**
 * Returns a promise that resolves the next time conditionFn() returns true,
 * checked once per Babylon render frame.
 *
 * Uses a persistent observer (add, not addOnce) that removes itself when done.
 * Since _tick was registered first (during construction), this handler always
 * runs AFTER _tick in the same frame — so it sees any flag _tick just set.
 * No re-registration during iteration = no infinite loop risk.
 */
function waitUntil(scene, conditionFn) {
  return new Promise((resolve) => {
    const observer = scene.onBeforeRenderObservable.add(() => {
      if (conditionFn()) {
        scene.onBeforeRenderObservable.remove(observer);
        resolve();
      }
    });
  });
}

// ─── Main class ──────────────────────────────────────────────────────────────
export class A2FAvatar {

  constructor(scene) {
    this.scene = scene;

    // Mesh / morph state
    this.faceMesh      = null;
    this.faceMap        = new Map();
    this.teethDownMap   = new Map();
    this.teethUpMap     = new Map();

    // Root node (set after VRM load, for positioning)
    this.rootNode       = null;

    // Manifest data
    this.manifest       = null;
    this.clips          = [];

    // Playback state
    this.state          = State.UNLOADED;
    this.currentClipIdx = -1;
    this.playbackTime   = 0;
    this.audio          = null;

    // Completion flag — set by _tickTransition, polled by waitUntil in playClip
    this._clipDone      = false;
    this._aborted       = false;

    // Idle state
    this.idleConfig     = { blinkIntervalMin: 2, blinkIntervalMax: 5, blinkDuration: 0.15,
                            breathCycleSpeed: 0.4, breathJawAmount: 0.012 };
    this.nextBlinkAt    = 0;
    this.blinkTimer     = -1;
    this.idleElapsed    = 0;

    // Procedural gaze (eye saccades) -- driven ourselves, same reason as blink:
    // the generation pipelines (LAM, and Audio2Face before it) don't produce
    // meaningful eyeLookIn/Out/Up/Down data, so without this the eyes never
    // move at all. See docs/FACIAL_ANIM_REGEN_NOTES.md "Weak/missing movement
    // categories". h/v are the currently-applied horizontal/vertical look
    // amount; gazeTarget is where the current glance is heading toward.
    this.gazeElapsed = 0;
    this.gazeTimer   = -1;
    this.nextGazeAt  = 1 + Math.random() * 2;
    this.gazeTarget  = { h: 0, v: 0 };
    this.gazeCurrent = { h: 0, v: 0 };

    // Procedural head sway -- same rationale: LAM's ARKit-52 output has no
    // head rotation at all (not even present in the format), so a fully
    // static head is a strong "not alive" signal. Set once the head bone is
    // found in _loadVRM; left null if no bone named "head" turns up (not
    // every rig necessarily uses that exact name).
    this.headBone      = null;
    this._headRestQuat = null;
    this.headSwayElapsed = 0;

    // Transition state
    this.transitionDuration  = 0.25;
    this.transitionElapsed   = 0;
    this.transitionSnapshot  = null;

    // All shapes we've ever touched (for cleanup)
    this.allTouchedShapes = new Set();

    // Event callbacks (optional, set from outside)
    this.onStateChange  = null;
    this.onClipStart    = null;
    this.onClipEnd      = null;
    this.onSequenceEnd  = null;

    // Register render tick — the SINGLE driver for all animation
    this._tickRef = this._tick.bind(this);
    this.scene.onBeforeRenderObservable.add(this._tickRef);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Loading
  // ═══════════════════════════════════════════════════════════════════════════

  async loadManifest(manifestPath) {
    const resp = await fetch(manifestPath);
    if (!resp.ok) throw new Error(`Failed to load manifest: HTTP ${resp.status}`);
    this.manifest = await resp.json();

    if (this.manifest.idle) {
      Object.assign(this.idleConfig, this.manifest.idle);
    }

    await this._loadVRM(this.manifest.avatar);

    this.clips = [];
    for (const entry of this.manifest.clips) {
      // Treat "N/A", missing, or unfetchable animation/audio paths as absent —
      // a clip with neither becomes a no-op used for explicit waits via delayAfter.
      let animData = null;
      if (entry.animation && entry.animation !== 'N/A') {
        const animResp = await fetch(entry.animation);
        if (animResp.ok) {
          try {
            animData = await animResp.json();
          } catch (e) {
            console.warn(`[A2FAvatar] Animation ${entry.animation} did not parse as JSON — skipping:`, e.message);
          }
        } else {
          console.warn(`[A2FAvatar] Animation ${entry.animation} returned HTTP ${animResp.status} — skipping`);
        }
      }
      const audioSrc = (entry.audio && entry.audio !== 'N/A') ? entry.audio : null;
      this.clips.push({ animData, audioSrc, id: entry.id, delayAfter: entry.delayAfter ?? 1.0 });
    }

    this._setState(State.IDLE);
    return this;
  }

  async _loadVRM(vrmPath) {
    // VRM is GLTF-based — use the standard GLTF loader (registered via @babylonjs/loaders/glTF)
    // by passing pluginExtension: ".glb". No CDN VRM loader needed.
    const result = await BABYLON.ImportMeshAsync(vrmPath, this.scene, { pluginExtension: ".glb" });
    this.rootNode = result.meshes[0] || null;

    // Search within the just-loaded meshes only — getMeshByName on the scene
    // returns the first match across ALL avatars, which collides with same-named
    // meshes from other A2FAvatar instances.
    const ownMeshes    = result.meshes;
    this.faceMesh      = ownMeshes.find(m => m.name === 'H_DDS_HighRes') || null;
    const teethDown    = ownMeshes.find(m => m.name === 'h_TeethDown') || null;
    const teethUp      = ownMeshes.find(m => m.name === 'h_TeethUp') || null;

    this.faceMap       = buildMorphMap(this.faceMesh);
    this.teethDownMap  = buildMorphMap(teethDown);
    this.teethUpMap    = buildMorphMap(teethUp);

    if (!this.faceMesh) {
      console.error('[A2FAvatar] H_DDS_HighRes mesh not found. Available meshes:',
        this.scene.meshes.map(m => m.name));
    }

    // Find the head bone for procedural sway. Exact match first ("head" is
    // VRM's standard humanoid bone name), falling back to a substring match
    // for rigs that don't follow it exactly -- same two-tier approach as
    // App.ts's arm-bone lookup, since naming isn't fully consistent across
    // the avatar library. Excludes "headtop"-style end-effector joints some
    // rigs include, which would otherwise false-match the substring check.
    const allNodes = [...ownMeshes, ...result.transformNodes];
    this.headBone = allNodes.find(n => n.name.toLowerCase() === 'head')
      || allNodes.find(n => n.name.toLowerCase().includes('head') && !n.name.toLowerCase().includes('top'))
      || null;

    if (this.headBone) {
      if (!this.headBone.rotationQuaternion) {
        this.headBone.rotationQuaternion = BABYLON.Quaternion.FromEulerVector(this.headBone.rotation || BABYLON.Vector3.Zero());
      }
      this._headRestQuat = this.headBone.rotationQuaternion.clone();
    } else {
      console.warn('[A2FAvatar] No head bone found for procedural sway. Available nodes:',
        allNodes.map(n => n.name));
    }

    // Find eye bones for procedural gaze. This model's face mesh has NO
    // eyeLookIn/Out/Up/Down blendshapes at all (confirmed by parsing the VRM
    // directly) -- gaze on this rig is bone-driven, not blendshape-driven,
    // same situation as the head. Exact match, excluding "_end" helper
    // joints some rigs attach past the real eye bone.
    this.leftEyeBone  = allNodes.find(n => n.name.toLowerCase() === 'lefteye')
      || allNodes.find(n => n.name.toLowerCase().includes('lefteye') && !n.name.toLowerCase().includes('end'))
      || null;
    this.rightEyeBone = allNodes.find(n => n.name.toLowerCase() === 'righteye')
      || allNodes.find(n => n.name.toLowerCase().includes('righteye') && !n.name.toLowerCase().includes('end'))
      || null;

    for (const [bone, label] of [[this.leftEyeBone, 'left'], [this.rightEyeBone, 'right']]) {
      if (bone && !bone.rotationQuaternion) {
        bone.rotationQuaternion = BABYLON.Quaternion.FromEulerVector(bone.rotation || BABYLON.Vector3.Zero());
      }
    }
    // Local rest rotation (same pattern as headBone) -- this is what
    // _tickGaze uses. NOT caching a world-space rest quaternion here: at
    // this point in load, App.ts hasn't yet applied the avatar's rootNode
    // rotation (its in-scene facing direction), so a world snapshot taken
    // now would be stale by however much the root gets rotated after this
    // -- that caused a ~120-240 degree mismatch ("eyes look inside out").
    // _tickGaze instead derives the eye's current world rest orientation
    // fresh each frame from this local quaternion + the bone's live parent
    // world rotation, which stays correct regardless of root/head motion.
    this._leftEyeRestQuat  = this.leftEyeBone  ? this.leftEyeBone.rotationQuaternion.clone()  : null;
    this._rightEyeRestQuat = this.rightEyeBone ? this.rightEyeBone.rotationQuaternion.clone() : null;

    if (!this.leftEyeBone && !this.rightEyeBone) {
      console.warn('[A2FAvatar] No eye bones found for procedural gaze. Available nodes:',
        allNodes.map(n => n.name));
    }
  }

  /**
   * Load a VRMA animation file and apply it to this avatar's skeleton.
   * Retargets each animation track to the VRM's transform node with the
   * same name (VRM humanoid naming convention: "hips", "spine", etc.).
   *
   * @param {string} vrmaPath - URL of the .vrma file
   * @param {object} [opts]
   * @param {boolean} [opts.loop=true]
   * @param {number}  [opts.speed=1.0]
   * @returns {Promise<BABYLON.AnimationGroup|null>}
   */
  async applyVRMA(vrmaPath, opts = {}) {
    const loop  = opts.loop  ?? true;
    const speed = opts.speed ?? 1.0;

    // Snapshot avatar's transform nodes BEFORE loading VRMA so we can
    // distinguish them from the VRMA's own loaded nodes.
    const avatarNodes = new Map();
    for (const tn of this.scene.transformNodes) avatarNodes.set(tn.name, tn);
    for (const m  of this.scene.meshes)         avatarNodes.set(m.name,  m);

    const result = await BABYLON.ImportMeshAsync(vrmaPath, this.scene, { pluginExtension: ".glb" });

    // Hide any dummy meshes the VRMA loaded (VRMA is animation-only)
    result.meshes.forEach(m => m.setEnabled(false));

    if (!result.animationGroups || result.animationGroups.length === 0) {
      console.warn(`[A2FAvatar] No animation groups found in ${vrmaPath}`);
      return null;
    }

    let retargeted = null;
    for (const animGroup of result.animationGroups) {
      const clone = animGroup.clone(
        `${animGroup.name}_retargeted`,
        (origTarget) => avatarNodes.get(origTarget?.name) || origTarget
      );
      clone.start(loop, speed);
      retargeted = retargeted || clone;
      // Stop & dispose the un-retargeted original so it doesn't fight the clone
      animGroup.stop();
      animGroup.dispose();
    }

    return retargeted;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Shape application
  // ═══════════════════════════════════════════════════════════════════════════

  _applyShape(name, value) {
    const ft = this.faceMap.get(name);
    if (ft) ft.influence = value;

    const teethName = TEETH_MAP[name];
    if (teethName) {
      // Some valid-vrm-avatars models export teeth morph target names with the
      // "h_teeth." prefix, some without it (same shapes, inconsistent naming
      // from the batch conversion — see docs/FACIAL_ANIM_REGEN_NOTES.md).
      // Try both so either convention works.
      const bareName = teethName.startsWith('h_teeth.') ? teethName.slice('h_teeth.'.length) : teethName;
      const td = this.teethDownMap.get(teethName) || this.teethDownMap.get(bareName);
      const tu = this.teethUpMap.get(teethName) || this.teethUpMap.get(bareName);
      if (td) td.influence = value;
      if (tu) tu.influence = value;
    }

    this.allTouchedShapes.add(name);
  }

  _resetAllShapes() {
    for (const name of this.allTouchedShapes) {
      this._applyShape(name, 0);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Playback controls
  // ═══════════════════════════════════════════════════════════════════════════

  /** Play every clip in sequence, with idle loops between them. */
  async playSequence() {
    this._aborted = false;

    for (let i = 0; i < this.clips.length; i++) {
      if (this._aborted) break;
      console.log("Playing clip:");
      await this.playClip(i);
      console.log("Clip played!");

      if (this._aborted) break;

      const delay = this.clips[i].delayAfter;
      if (delay > 0 && i < this.clips.length - 1) {
        await this._idleFor(delay);
      }
    }

    this._setState(State.IDLE);
    if (this.onSequenceEnd) this.onSequenceEnd();
  }

  /**
   * Play a single clip by index.
   *
   * Flow (no stored resolve — uses flag + same-loop polling):
   *   1. Load audio, reset _clipDone flag, set state PLAYING, start audio
   *   2. _tick → _tickPlaying runs each render frame, applying weights
   *   3. When clip ends, _tickPlaying → _startTransition() → state TRANSITIONING
   *   4. _tick → _tickTransition blends to neutral, then sets _clipDone = true
   *   5. waitUntil (addOnce on same observable, fires AFTER _tick) sees flag → resolves
   */
  async playClip(index) {
    if (index < 0 || index >= this.clips.length) return;

    const clip = this.clips[index];
    this.currentClipIdx = index;

    // No animation and no audio → pure no-op (used for explicit waits via delayAfter)
    if (!clip.animData && !clip.audioSrc) return;

    // Load audio
    this.audio = null;
    if (clip.audioSrc) {
      try {
        this.audio = new Audio(clip.audioSrc);
        this.audio.preload = 'auto';
        await new Promise((res, rej) => {
          this.audio.addEventListener('canplaythrough', res, { once: true });
          this.audio.addEventListener('error', () => rej(new Error('Audio load failed')), { once: true });
        });
      } catch (e) {
        console.warn(`[A2FAvatar] Audio failed for clip "${clip.id}":`, e.message);
        this.audio = null;
      }
    }

    // Reset state
    this.playbackTime = 0;
    this._clipDone = false;

    // Go
    this._setState(State.PLAYING);
    if (this.onClipStart) this.onClipStart(index, clip.id);
    if (this.audio){
      console.log("Audio is valid!!");
      this.audio.play();
    }

    // Block until the transition after this clip completes.
    // waitUntil checks once per render frame, on the same observable as _tick.
    await waitUntil(this.scene, () => this._clipDone || this._aborted);
  }

  /** Stop everything, reset to idle. */
  stopAndReset() {
    this._aborted = true;
    this._clipDone = true;   // unblock any waiting playClip
    if (this.audio) { this.audio.pause(); this.audio = null; }
    this._resetAllShapes();
    this._setState(State.IDLE);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Idle
  // ═══════════════════════════════════════════════════════════════════════════

  /** Idle for a duration, using the same render-observable polling. */
  _idleFor(seconds) {
    this._setState(State.IDLE);
    const deadline = performance.now() + seconds * 1000;
    return waitUntil(this.scene, () => performance.now() >= deadline || this._aborted);
  }

  _tickIdle(dt) {
    this._tickBlink(dt);
    this._tickGaze(dt);

    // Breathing — not driven during PLAYING, where real speech jaw movement must win
    const cfg = this.idleConfig;
    const breathVal = (Math.sin(this.idleElapsed * cfg.breathCycleSpeed * Math.PI * 2) + 1) * 0.5;
    this._applyShape('jawOpen', breathVal * cfg.breathJawAmount);
  }

  // Blinking only (no breathing/jaw) — also called from _tickPlaying, since the
  // captured animation data's own eyeBlink weights are flat/near-zero and would
  // otherwise suppress blinking for the whole duration of a clip.
  _tickBlink(dt) {
    this.idleElapsed += dt;
    const cfg = this.idleConfig;

    if (this.blinkTimer < 0) {
      if (this.idleElapsed >= this.nextBlinkAt) {
        this.blinkTimer = 0;
      }
    }

    if (this.blinkTimer >= 0) {
      this.blinkTimer += dt;
      const t = this.blinkTimer / cfg.blinkDuration;

      if (t <= 1.0) {
        const blinkWeight = t < 0.5 ? t * 2 : (1 - t) * 2;
        this._applyShape('eyeBlinkLeft', blinkWeight);
        this._applyShape('eyeBlinkRight', blinkWeight);
      } else {
        this._applyShape('eyeBlinkLeft', 0);
        this._applyShape('eyeBlinkRight', 0);
        this.blinkTimer = -1;
        this.nextBlinkAt = this.idleElapsed +
          cfg.blinkIntervalMin + Math.random() * (cfg.blinkIntervalMax - cfg.blinkIntervalMin);
      }
    }
  }

  // Eye saccades only — also called from _tickPlaying. Bone-driven, not
  // blendshape-driven: this model's face mesh has no eyeLookIn/Out/Up/Down
  // morph targets at all (confirmed by parsing the VRM directly), so the
  // original blendshape version of this method silently did nothing --
  // _applyShape no-ops for a name that isn't in faceMap. Rotates the real
  // eye bones instead, same approach as _tickHeadSway. Picks a small random
  // glance target at a random interval, eases into it, holds briefly, eases
  // back to neutral, repeats. h/v are a shared horizontal/vertical look
  // amount applied as yaw/pitch to both eye bones identically (unlike the
  // old blendshape convention, a bone doesn't need separate "In"/"Out"
  // naming per eye -- both eyes just rotate the same real-world direction).
  _tickGaze(dt) {
    if (!this.leftEyeBone && !this.rightEyeBone) return;
    this.gazeElapsed += dt;

    if (this.gazeTimer < 0) {
      if (this.gazeElapsed >= this.nextGazeAt) {
        // Amplitude tuned down from an initial 0.3/0.2 rad (~17/11 deg),
        // which looked like a dramatic eye-roll rather than a subtle glance
        // once the rotation math was actually correct. Adjust further if
        // this still reads as too much or too little.
        this.gazeTarget = {
          h: (Math.random() * 2 - 1) * 0.12,
          v: (Math.random() * 2 - 1) * 0.06,
        };
        this.gazeTimer = 0;
      }
    }

    if (this.gazeTimer >= 0) {
      this.gazeTimer += dt;
      const easeDuration = 0.35;
      const holdDuration = 1.2;

      if (this.gazeTimer < easeDuration) {
        const t = this.gazeTimer / easeDuration;
        this.gazeCurrent = { h: this.gazeTarget.h * t, v: this.gazeTarget.v * t };
      } else if (this.gazeTimer < easeDuration + holdDuration) {
        this.gazeCurrent = { ...this.gazeTarget };
      } else if (this.gazeTimer < easeDuration * 2 + holdDuration) {
        const t = (this.gazeTimer - easeDuration - holdDuration) / easeDuration;
        this.gazeCurrent = { h: this.gazeTarget.h * (1 - t), v: this.gazeTarget.v * (1 - t) };
      } else {
        this.gazeCurrent = { h: 0, v: 0 };
        this.gazeTimer = -1;
        this.nextGazeAt = this.gazeElapsed + 1.5 + Math.random() * 2.5;
      }
    }

    const { h, v } = this.gazeCurrent;
    // Matrix-based world-space composition, re-applied 2026-10-27 (replacing
    // a pure-quaternion version of the same idea). The avatar's root node
    // has a (1,1,-1) mirrored scale baked in from export, which a quaternion
    // can't represent -- Babylon's Matrix.decompose() silently compensates
    // for that by flipping an axis sign whenever it decomposes a matrix with
    // a reflection in it, and that compensation gets baked into whatever
    // quaternion comes out, corrupting any further quaternion math done
    // with it. Matrices don't have this problem (a reflection is just a
    // normal, lossless matrix), so this version stays in matrix form for
    // the whole rest->offset->local computation and only decomposes once,
    // at the very end, on the final LOCAL matrix -- which has the parent's
    // mirror divided back out by then, so it decomposes cleanly without
    // needing that compensation. Both eyes get the same world-space offset
    // regardless of their own local axis conventions, which is what should
    // make this robust to Black's confirmed mismatched left/right rest axes
    // (see git history) without any per-eye sign correction.
    const offsetMatrix = BABYLON.Matrix.Identity();
    BABYLON.Matrix.FromQuaternionToRef(BABYLON.Quaternion.RotationYawPitchRoll(h, v, 0), offsetMatrix);

    for (const [bone, restLocalQuat] of [
      [this.leftEyeBone, this._leftEyeRestQuat],
      [this.rightEyeBone, this._rightEyeRestQuat],
    ]) {
      if (!bone) continue;

      const restLocalMatrix = BABYLON.Matrix.Identity();
      BABYLON.Matrix.FromQuaternionToRef(restLocalQuat, restLocalMatrix);

      let parentWorldMatrix = BABYLON.Matrix.Identity();
      if (bone.parent) {
        bone.parent.computeWorldMatrix(true);
        parentWorldMatrix = bone.parent.getWorldMatrix();
      }

      // world = local * parentWorld (Babylon's row-vector convention)
      const restWorldMatrix = restLocalMatrix.multiply(parentWorldMatrix);
      const desiredWorldMatrix = restWorldMatrix.multiply(offsetMatrix);
      const newLocalMatrix = desiredWorldMatrix.multiply(BABYLON.Matrix.Invert(parentWorldMatrix));

      const scale = new BABYLON.Vector3();
      const rot = new BABYLON.Quaternion();
      const pos = new BABYLON.Vector3();
      newLocalMatrix.decompose(scale, rot, pos);
      bone.rotationQuaternion = rot;
    }
  }

  // Procedural head sway -- bone rotation, not a blendshape, so unlike blink/
  // gaze it doesn't go through _applyShape and isn't at risk of being
  // overwritten by per-frame animation data (frame data only ever touches
  // face morph targets). Runs unconditionally every tick regardless of
  // state -- see _tick() below -- rather than being called per-state like
  // blink/gaze. Small mismatched sine frequencies per axis so it doesn't
  // read as a metronome; applied as an offset multiplied onto the bone's
  // original rest rotation, never replacing it.
  _tickHeadSway(dt) {
    if (!this.headBone) return;
    this.headSwayElapsed += dt;
    const t = this.headSwayElapsed;

    const pitch = Math.sin(t * 0.37) * 0.035 + Math.sin(t * 0.91 + 1.3) * 0.015;
    const yaw   = Math.sin(t * 0.29 + 0.6) * 0.05 + Math.sin(t * 0.77 + 2.1) * 0.02;
    const roll  = Math.sin(t * 0.23 + 2.4) * 0.02;

    const offset = BABYLON.Quaternion.RotationYawPitchRoll(yaw, pitch, roll);
    this.headBone.rotationQuaternion = this._headRestQuat.multiply(offset);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Transition (blend current pose → neutral)
  // ═══════════════════════════════════════════════════════════════════════════

  _startTransition() {
    const names = [];
    const weights = [];
    for (const name of this.allTouchedShapes) {
      const ft = this.faceMap.get(name);
      if (ft && ft.influence > 0.001) {
        names.push(name);
        weights.push(ft.influence);
      }
    }
    this.transitionSnapshot = { names, weights };
    this.transitionElapsed = 0;
    this._setState(State.TRANSITIONING);
  }

  _tickTransition(dt) {
    this.transitionElapsed += dt;
    const t = Math.min(1, this.transitionElapsed / this.transitionDuration);

    const snap = this.transitionSnapshot;
    for (let i = 0; i < snap.names.length; i++) {
      this._applyShape(snap.names[i], lerp(snap.weights[i], 0, t));
    }

    this._tickIdle(dt);

    if (t >= 1) {
      this.transitionSnapshot = null;
      this._setState(State.IDLE);
      this._clipDone = true;   // ← the ONLY signal — no stored resolve to call
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Clip playback
  // ═══════════════════════════════════════════════════════════════════════════

  _tickPlaying(dt) {
    const clip = this.clips[this.currentClipIdx];
    if (!clip) return;

    const animData = clip.animData;

    if (this.audio) {
      //console.log(`AUDIO TIMESTAMP ${this.audio.currentTime}`);
      this.playbackTime = this.audio.currentTime;
    } else {
      this.playbackTime += dt;
    }

    const duration = animData.frameCount / animData.fps;
    const frameIdx = Math.floor(this.playbackTime * animData.fps);
    const pastLastFrame = frameIdx >= animData.frames.length;
    const audioEnded = this.audio ? this.audio.ended : false;

    //console.log(`OUT OF DURATION TOTAL ${duration}`);
    if (this.playbackTime >= duration || audioEnded || pastLastFrame) {
      if (this.audio) { this.audio.pause(); this.audio = null; }
      if (this.onClipEnd) this.onClipEnd(this.currentClipIdx, clip.id);
      this._startTransition();
      return;
    }

    const frame = animData.frames[Math.min(frameIdx, animData.frames.length - 1)];
    if (!frame) return;

    const names = animData.blendShapeNames;
    const weights = frame.weights;
    for (let i = 0; i < names.length; i++) {
      this._applyShape(names[i], weights[i] || 0);
    }

    this._tickBlink(dt);
    this._tickGaze(dt);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Main tick
  // ═══════════════════════════════════════════════════════════════════════════

  _lastTickMs = performance.now();

  _tick() {
    const now = performance.now();
    const dt = (now - this._lastTickMs) / 1000;
    this._lastTickMs = now;

    // Wrapped in try/catch: this runs on scene.onBeforeRenderObservable, which
    // does NOT catch exceptions from its observers -- an uncaught throw here
    // previously killed Babylon's entire render loop (white screen / stuck
    // loading screen), traced back to the procedural gaze code referencing a
    // BABYLON.* symbol missing from App.ts's minimal window.BABYLON shim.
    try {
      this._tickHeadSway(dt);

      switch (this.state) {
        case State.IDLE:
          this._tickIdle(dt);
          break;
        case State.PLAYING:
          this._tickPlaying(dt);
          break;
        case State.TRANSITIONING:
          this._tickTransition(dt);
          break;
      }
    } catch (e) {
      if (!this._tickErrorLogged) {
        this._tickErrorLogged = true;
        console.error('[A2FAvatar] Error in animation tick (further errors suppressed):', e);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  State management
  // ═══════════════════════════════════════════════════════════════════════════

  _setState(s) {
    if (this.state === s) return;
    this.state = s;
    if (this.onStateChange) this.onStateChange(s, this.currentClipIdx);
  }

  dispose() {
    this.stopAndReset();
    this.scene.onBeforeRenderObservable.removeCallback(this._tickRef);
  }
}