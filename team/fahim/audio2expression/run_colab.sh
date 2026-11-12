#!/usr/bin/env bash
# Runs the full LAM Audio2Expression Colab pipeline end-to-end: reuses (or
# provisions) a GPU session, uploads each given .wav, runs inference, and
# downloads each result JSON next to its input file. The only input this
# needs is the list of audio files.
#
# Usage:
#   ./run_colab.sh clip1.wav [clip2.wav ...]
#   ./run_colab.sh /path/to/folder                    # every .wav directly inside it
#   ./run_colab.sh --keep clip1.wav [clip2.wav ...]   # leave the VM running after
#
# Needs google-colab-cli installed and authenticated in this WSL venv --
# see babylon-clay-scene/ANIMATION_PIPELINE.md Section 6 for the one-time
# setup. Run this from WSL, not PowerShell.
#
# Releases the GPU session by default once this run finishes, to avoid
# burning free-tier compute-unit quota on an idle VM -- pass --keep if
# you're about to run another batch right away and want to skip the
# venv/clone/deps/weights setup next time.

set -euo pipefail

KEEP_RUNNING=0
ARGS=()
for arg in "$@"; do
    if [ "$arg" = "--keep" ]; then
        KEEP_RUNNING=1
    else
        ARGS+=("$arg")
    fi
done
set -- "${ARGS[@]}"

if [ "$#" -eq 0 ]; then
    echo "Usage: $0 [--keep] clip1.wav [clip2.wav ...] | folder/" >&2
    exit 1
fi

# Expand any directory argument into the .wav files directly inside it, so
# you can point this at a folder instead of listing every clip by hand.
EXPANDED_ARGS=()
shopt -s nullglob
for arg in "$@"; do
    if [ -d "$arg" ]; then
        wavs=("$arg"/*.wav)
        if [ "${#wavs[@]}" -eq 0 ]; then
            echo "No .wav files found directly inside: $arg" >&2
            exit 1
        fi
        echo "Expanding folder '$arg' -> ${#wavs[@]} .wav file(s)"
        EXPANDED_ARGS+=("${wavs[@]}")
    else
        EXPANDED_ARGS+=("$arg")
    fi
done
shopt -u nullglob
set -- "${EXPANDED_ARGS[@]}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SESSION="lam"
VENV="$HOME/colab-cli-env/bin/activate"

if [ ! -f "$VENV" ]; then
    echo "Colab CLI venv not found at $VENV -- see ANIMATION_PIPELINE.md Section 6 for setup" >&2
    exit 1
fi
# shellcheck disable=SC1090
source "$VENV"

echo "== Checking for an existing '$SESSION' session =="
# `colab status -s` can report success from stale local metadata even when
# the session's gone from the backend -- `colab sessions` lists what's
# actually live there, so check that instead.
if colab sessions 2>&1 | grep -qw "$SESSION"; then
    echo "Reusing existing session '$SESSION'"
else
    echo "No existing session on the backend -- provisioning a new T4 GPU session (this can take a minute)"
    colab new -s "$SESSION" --gpu T4
fi

echo "== Uploading clips =="
for wav in "$@"; do
    if [ ! -f "$wav" ]; then
        echo "File not found: $wav" >&2
        exit 1
    fi
    name="$(basename "$wav")"
    echo "  $wav -> /content/$name"
    colab upload -s "$SESSION" "$wav" "/content/$name"
done

echo "== Running inference (slow on a fresh session -- venv/clone/deps/weights setup; fast on a reused one) =="
colab exec -s "$SESSION" -f "$SCRIPT_DIR/lam_audio2expression_colab.py"

echo "== Downloading results =="
for wav in "$@"; do
    clip="$(basename "$wav" .wav)"
    out_dir="$(dirname "$wav")"
    remote_json="/content/LAM_Audio2Expression/exp/audio2exp_${clip}/${clip}.json"
    local_json="${out_dir}/${clip}_lam.json"
    echo "  $remote_json -> $local_json"
    colab download -s "$SESSION" "$remote_json" "$local_json"
done

if [ "$KEEP_RUNNING" -eq 1 ]; then
    echo "== Done. Session '$SESSION' left running (--keep) -- release it later with 'colab stop -s $SESSION'. =="
else
    echo "== Releasing session '$SESSION' to avoid burning idle compute-unit quota =="
    colab stop -s "$SESSION"
fi
