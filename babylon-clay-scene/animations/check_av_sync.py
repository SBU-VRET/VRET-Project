#!/usr/bin/env python3
"""
Check for a timing offset between a clip's audio and its blendshape mouth-open weights.

Computes the audio's RMS amplitude envelope and the animation's mouth-openness curve,
then cross-correlates them to find the lag (in seconds) that best aligns the two.
A near-zero lag means they're in sync; a consistent nonzero lag points to a real
offset baked into the generation/combining pipeline rather than a playback bug.

Usage:
    python check_av_sync.py audio/altaforte.wav animations/altaforte_frames.json
"""

import json
import sys
import wave
import numpy as np


MOUTH_SHAPES = {
    "jawOpen", "mouthOpen", "mouthFunnel", "mouthPucker",
    "mouthShrugUpper", "mouthShrugLower", "viseme_aa", "viseme_O",
}


def audio_envelope(wav_path: str, hop_s: float = 1 / 30):
    with wave.open(wav_path, "rb") as w:
        sr = w.getframerate()
        n = w.getnframes()
        raw = w.readframes(n)
        width = w.getsampwidth()
        channels = w.getnchannels()

    dtype = {1: np.int8, 2: np.int16, 4: np.int32}[width]
    samples = np.frombuffer(raw, dtype=dtype).astype(np.float64)
    if channels > 1:
        samples = samples.reshape(-1, channels).mean(axis=1)
    samples /= np.iinfo(dtype).max

    hop = int(sr * hop_s)
    n_frames = len(samples) // hop
    env = np.array([
        np.sqrt(np.mean(samples[i * hop:(i + 1) * hop] ** 2))
        for i in range(n_frames)
    ])
    return env, hop_s


def mouth_curve(frames_json_path: str):
    with open(frames_json_path) as f:
        data = json.load(f)

    names = data["blendShapeNames"]
    idxs = [i for i, n in enumerate(names) if n in MOUTH_SHAPES]
    if not idxs:
        print(f"Warning: none of {MOUTH_SHAPES} found in blendShapeNames: {names}")
        idxs = range(len(names))

    times = [fr["time"] for fr in data["frames"]]
    vals = [max(fr["weights"][i] for i in idxs) for fr in data["frames"]]
    fps = data.get("fps", 30)
    return np.array(times), np.array(vals), fps


def resample_to_common_grid(a_env, a_hop, m_times, m_vals, fps):
    hop_s = 1 / fps
    duration = min(len(a_env) * a_hop, m_times[-1])
    grid = np.arange(0, duration, hop_s)

    a_grid_idx = np.clip((grid / a_hop).astype(int), 0, len(a_env) - 1)
    a_on_grid = a_env[a_grid_idx]

    m_on_grid = np.interp(grid, m_times, m_vals)
    return a_on_grid, m_on_grid, hop_s


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)

    wav_path, frames_path = sys.argv[1], sys.argv[2]

    env, hop_s = audio_envelope(wav_path)
    m_times, m_vals, fps = mouth_curve(frames_path)
    a_grid, m_grid, grid_hop = resample_to_common_grid(env, hop_s, m_times, m_vals, fps)

    # Normalize before cross-correlating
    a_norm = (a_grid - a_grid.mean()) / (a_grid.std() + 1e-9)
    m_norm = (m_grid - m_grid.mean()) / (m_grid.std() + 1e-9)

    corr = np.correlate(m_norm, a_norm, mode="full")
    lags = np.arange(-len(a_norm) + 1, len(m_norm))
    best_lag_samples = lags[np.argmax(corr)]
    best_lag_s = best_lag_samples * grid_hop

    print(f"Audio:     {wav_path}")
    print(f"Animation: {frames_path}")
    print(f"Best-aligning lag: {best_lag_s:+.3f}s")
    print(
        "  (positive = mouth animation lags behind audio; "
        "negative = animation leads audio; near 0 = in sync)"
    )
    print(f"Peak correlation: {corr.max() / len(a_norm):.3f} (1.0 = perfect match)")


if __name__ == "__main__":
    main()
