"""Add speech-driven head nods to an animation JSON, from the clip's audio.

LAM's ARKit-52 output has no head pose, so the head only does the runtime's slow
procedural sway, which ignores what's being said. Speakers dip their head on
stressed syllables, and those line up with peaks in loudness and pitch. This
finds those peaks straight from the .wav (no transcript, no model) and writes a
"headNods" list into a copy of the animation JSON; A2FAvatar plays each one as a
short dip layered on the sway. Face weights are copied through untouched, so it
chains after mouth_correction.py:

  *_lam_converted.json -> mouth_correction.py -> *_lam_corrected.json
                       -> head_nods.py        -> *_lam_corrected_nod.json

Usage:
  .venv/Scripts/python.exe head_nods.py IN.json AUDIO.wav OUT.json
  [--min-gap 0.7] [--threshold 0.7] [--lead 0.05] [--dump]
"""
import argparse
import json
import sys

import numpy as np
import soundfile as sf
from scipy.signal import find_peaks, resample_poly

SAMPLE_RATE = 16000
HOP = 0.01          # analysis step, seconds
WIN = 0.04          # analysis window, seconds (2+ pitch periods at the 70Hz floor)
F0_MIN, F0_MAX = 70.0, 400.0


def load_audio_16k(path):
    audio, sr = sf.read(path, dtype="float32", always_2d=True)
    audio = audio.mean(axis=1)
    if sr != SAMPLE_RATE:
        g = np.gcd(sr, SAMPLE_RATE)
        audio = resample_poly(audio, SAMPLE_RATE // g, sr // g).astype(np.float32)
    return audio


def frame_features(audio):
    """Per-frame loudness (dB), pitch (Hz) and voicing, one frame per HOP."""
    n_win, n_hop = int(SAMPLE_RATE * WIN), int(SAMPLE_RATE * HOP)
    audio = np.pad(audio, (n_win // 2, n_win // 2))
    frames = np.lib.stride_tricks.sliding_window_view(audio, n_win)[::n_hop]
    times = np.arange(len(frames)) * HOP

    db = 20 * np.log10(np.sqrt(np.mean(frames ** 2, axis=1)) + 1e-9)

    # Normalised autocorrelation via FFT; the strongest lag in the voice range is
    # the period, and its height says how periodic (voiced) the frame is.
    windowed = frames * np.hanning(n_win)
    spec = np.fft.rfft(windowed, n=2 * n_win, axis=1)
    ac = np.fft.irfft(np.abs(spec) ** 2, axis=1)[:, :n_win]
    ac /= ac[:, :1] + 1e-12
    lo, hi = int(SAMPLE_RATE / F0_MAX), int(SAMPLE_RATE / F0_MIN)
    lag = np.argmax(ac[:, lo:hi], axis=1) + lo
    clarity = ac[np.arange(len(ac)), lag]
    f0 = SAMPLE_RATE / lag

    voiced = (clarity > 0.45) & (db > db.max() - 30)
    return times, db, f0, voiced


def prominence_curve(db, f0, voiced, smooth=0.09):
    """Loudness + pitch z-scores over voiced frames, smoothed to syllable scale."""
    if voiced.sum() < 10:
        return np.full(len(db), -3.0)
    semis = 12 * np.log2(f0 / np.median(f0[voiced]))
    z = lambda x: (x - x[voiced].mean()) / (x[voiced].std() + 1e-9)
    p = np.where(voiced, 0.6 * z(db) + 0.4 * z(semis), -3.0)
    k = np.hanning(max(3, int(smooth / HOP)))
    return np.convolve(p, k / k.sum(), mode="same")


def pick_nods(times, prom, min_gap, threshold, lead):
    peaks, props = find_peaks(prom, height=threshold, distance=max(1, int(min_gap / HOP)), prominence=0.5)
    if len(peaks) == 0:
        return []
    h = props["peak_heights"]
    top = max(np.percentile(h, 90), threshold + 1e-6)
    strength = 0.4 + 0.6 * np.clip((h - threshold) / (top - threshold), 0, 1)
    return [{"time": round(max(0.0, float(times[i]) - lead), 3), "strength": round(float(s), 3)}
            for i, s in zip(peaks, strength)]


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("anim_in")
    ap.add_argument("audio")
    ap.add_argument("anim_out")
    ap.add_argument("--min-gap", type=float, default=0.7, help="seconds between nods (lower = busier head)")
    ap.add_argument("--threshold", type=float, default=0.7, help="prominence z-score a peak must reach")
    ap.add_argument("--lead", type=float, default=0.05,
                    help="seconds the nod's lowest point lands before the stressed syllable's peak")
    ap.add_argument("--dump", action="store_true", help="print every nod time/strength")
    args = ap.parse_args()

    anim = json.load(open(args.anim_in))
    audio = load_audio_16k(args.audio)
    times, db, f0, voiced = frame_features(audio)
    nods = pick_nods(times, prominence_curve(db, f0, voiced), args.min_gap, args.threshold, args.lead)

    anim["headNods"] = nods
    anim["headNodsParams"] = {"minGap": args.min_gap, "threshold": args.threshold, "lead": args.lead}
    json.dump(anim, open(args.anim_out, "w"))

    dur = len(audio) / SAMPLE_RATE
    if args.dump:
        print(" ".join(f"{n['time']:.2f}:{n['strength']:.2f}" for n in nods))
    print(f"{len(nods)} nods over {dur:.1f}s ({len(nods) / dur:.2f}/s), "
          f"{voiced.mean() * 100:.0f}% voiced -> {args.anim_out}")


if __name__ == "__main__":
    sys.exit(main())
