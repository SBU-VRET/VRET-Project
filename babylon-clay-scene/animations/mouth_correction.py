"""Post-process LAM output: sharpen mouth shapes per phoneme class.

Regression models like LAM average toward a mushy middle mouth: weak lip closure
on M/B/P, a jaw that barely drops on open vowels, little rounding on W/OO, and a
lower lip that stays pulled down (~0.45 mouthLowerDown) on almost every sound.
This finds phonemes straight from the audio with a wav2vec2 phoneme-CTC model
(no transcript needed), then eases a few shapes toward per-class targets inside
each phoneme's window. Everything outside a window is left exactly as LAM made it.

Usage:
  .venv/Scripts/python.exe mouth_correction.py IN_lam_converted.json AUDIO.wav OUT.json
  [--classes bilabial,labiodental,...] [--strength 1.0] [--dump-phones]
"""
import argparse
import json
import sys

import numpy as np
import soundfile as sf
import torch
from huggingface_hub import hf_hub_download
from scipy.signal import resample_poly
from transformers import Wav2Vec2FeatureExtractor, Wav2Vec2ForCTC

MODEL_ID = "facebook/wav2vec2-lv-60-espeak-cv-ft"
SAMPLE_RATE = 16000

LOWER_DOWN = ("mouthLowerDownLeft", "mouthLowerDownRight")
UPPER_UP = ("mouthUpperUpLeft", "mouthUpperUpRight")
STRETCH = ("mouthStretchLeft", "mouthStretchRight")
SMILE = ("mouthSmileLeft", "mouthSmileRight")
PRESS = ("mouthPressLeft", "mouthPressRight")
ROUND = ("mouthFunnel", "mouthPucker")

# Each class: which IPA symbols it covers, how its window sits around the CTC
# onset spike, and per-shape targets as (mode, value): "min" = raise to at least,
# "max" = lower to at most. "span" windows run from the onset to the next phoneme.
CLASSES = {
    "bilabial": {
        "match": lambda s: s[:1] in ("p", "b", "m"),
        "window": ("fixed", 0.06, 0.03),
        "targets": {"mouthClose": ("min", 0.65), "jawOpen": ("max", 0.0),
                    **{n: ("max", 0.0) for n in LOWER_DOWN + UPPER_UP + ROUND}},
    },
    "labiodental": {
        # No lip-tuck shape on these rigs (mouthRollLower is absent), so this is an
        # approximation: jaw near shut, lower lip up, upper lip lifted off it.
        "match": lambda s: s[:1] in ("f", "v"),
        "window": ("fixed", 0.04, 0.05),
        "targets": {"jawOpen": ("max", 0.05), **{n: ("max", 0.0) for n in LOWER_DOWN + ROUND},
                    **{n: ("min", 0.3) for n in UPPER_UP}},
    },
    "sibilant": {
        "match": lambda s: s in ("s", "z"),
        "window": ("span", 0.02, 0.12),
        "targets": {"jawOpen": ("max", 0.04), **{n: ("max", 0.15) for n in LOWER_DOWN},
                    **{n: ("min", 0.2) for n in STRETCH}},
    },
    "postalveolar": {
        "match": lambda s: s in ("ʃ", "ʒ", "tʃ", "dʒ"),
        "window": ("span", 0.03, 0.14),
        "targets": {"jawOpen": ("max", 0.06), "mouthFunnel": ("min", 0.35),
                    **{n: ("max", 0.15) for n in LOWER_DOWN}},
    },
    "rounded": {
        "match": lambda s: s in ("w", "uː", "u", "ʊ"),
        "window": ("span", 0.04, 0.18),
        "targets": {"mouthPucker": ("min", 0.6), **{n: ("max", 0.0) for n in STRETCH + SMILE}},
    },
    "rounded_open": {
        "match": lambda s: s in ("oʊ", "ɔː", "ɔ", "o"),
        "window": ("span", 0.03, 0.2),
        "targets": {"mouthFunnel": ("min", 0.3), "mouthPucker": ("min", 0.3), "jawOpen": ("min", 0.2),
                    **{n: ("max", 0.0) for n in STRETCH + SMILE}},
    },
    "open": {
        "match": lambda s: s in ("ɑː", "ɑ", "a", "æ", "aɪ", "aʊ", "ʌ", "ɐ"),
        "window": ("span", 0.03, 0.2),
        "targets": {"jawOpen": ("min", 0.32)},
    },
    "spread": {
        "match": lambda s: s in ("iː", "i", "ɪ", "eɪ", "ɛ"),
        "window": ("span", 0.03, 0.16),
        "targets": {**{n: ("min", 0.25) for n in STRETCH}, **{n: ("max", 0.1) for n in ROUND}},
    },
}


def load_audio_16k(path):
    audio, sr = sf.read(path, dtype="float32", always_2d=True)
    audio = audio.mean(axis=1)
    if sr != SAMPLE_RATE:
        g = np.gcd(sr, SAMPLE_RATE)
        audio = resample_poly(audio, SAMPLE_RATE // g, sr // g).astype(np.float32)
    return audio


def recognize_phonemes(audio, model_id=MODEL_ID):
    """Greedy CTC decode -> [(onset_seconds, ipa_symbol)]."""
    # The phoneme tokenizer pulls in phonemizer+espeak; we only need its vocab.
    vocab = {v: k for k, v in json.load(open(hf_hub_download(model_id, "vocab.json"), encoding="utf-8")).items()}
    extractor = Wav2Vec2FeatureExtractor.from_pretrained(model_id)
    model = Wav2Vec2ForCTC.from_pretrained(model_id).eval()
    inputs = extractor(audio, sampling_rate=SAMPLE_RATE, return_tensors="pt")
    with torch.no_grad():
        logits = model(inputs.input_values).logits[0]
    ids = logits.argmax(dim=-1).tolist()
    frame_dt = len(audio) / SAMPLE_RATE / len(ids)
    blank = model.config.pad_token_id
    phones, prev = [], blank
    for i, tok in enumerate(ids):
        if tok != blank and tok != prev:
            phones.append((i * frame_dt, vocab[tok]))
        prev = tok
    return phones


def envelope(times, windows, ramp):
    env = np.zeros(len(times))
    for s, e in windows:
        d = np.where(times < s, s - times, np.where(times > e, times - e, 0.0))
        env = np.maximum(env, np.where(d >= ramp, 0.0, 0.5 * (1 + np.cos(np.pi * d / ramp))))
    return env


def class_windows(phones, cls):
    kind, a, b = cls["window"]
    out = []
    for k, (t, s) in enumerate(phones):
        if not cls["match"](s):
            continue
        if kind == "fixed":
            out.append((t - a, t + b))
        else:
            nxt = phones[k + 1][0] if k + 1 < len(phones) else t + b
            out.append((t, min(nxt - a, t + b)))
    return out


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("anim_in")
    ap.add_argument("audio")
    ap.add_argument("anim_out")
    ap.add_argument("--classes", default=",".join(CLASSES), help="comma list, from: " + ",".join(CLASSES))
    ap.add_argument("--strength", type=float, default=1.0, help="0..1 blend toward the class targets")
    ap.add_argument("--ramp", type=float, default=0.08, help="raised-cosine ease in/out, seconds (>=2 frames at 30fps)")
    ap.add_argument("--model", default=MODEL_ID)
    ap.add_argument("--dump-phones", action="store_true")
    args = ap.parse_args()

    anim = json.load(open(args.anim_in))
    names = anim["blendShapeNames"]
    times = np.array([f["time"] for f in anim["frames"]])
    W = np.array([f["weights"] for f in anim["frames"]], dtype=np.float64)

    phones = recognize_phonemes(load_audio_16k(args.audio), args.model)
    if args.dump_phones:
        print(" ".join(f"{t:.2f}:{s}" for t, s in phones))

    # Classes are applied in order onto the running result; later classes win
    # where windows overlap, and bilabial runs last so closures always land.
    chosen = [c.strip() for c in args.classes.split(",") if c.strip()]
    order = [c for c in CLASSES if c in chosen and c != "bilabial"] + (["bilabial"] if "bilabial" in chosen else [])
    touched = np.zeros(len(times), dtype=bool)
    for cname in order:
        cls = CLASSES[cname]
        wins = class_windows(phones, cls)
        env = envelope(times, wins, args.ramp) * args.strength
        touched |= env > 0.01
        for shape, (mode, val) in cls["targets"].items():
            i = names.index(shape)
            target = np.maximum(W[:, i], val) if mode == "min" else np.minimum(W[:, i], val)
            W[:, i] += env * (target - W[:, i])
        print(f"  {cname:13s} {len(wins):3d} windows")

    for f, row in zip(anim["frames"], W):
        f["weights"] = [round(float(x), 6) for x in row]
    json.dump(anim, open(args.anim_out, "w"))
    print(f"{len(phones)} phonemes, {int(touched.sum())}/{len(times)} frames touched -> {args.anim_out}")


if __name__ == "__main__":
    sys.exit(main())
