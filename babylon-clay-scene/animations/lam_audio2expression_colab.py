# Headless LAM Audio2Expression inference on a Colab GPU VM.
#
# This is the google-colab-cli-driven equivalent of
# LAM_Audio2Expression_Colab.ipynb in this same folder -- same steps, same
# knobs (brow_movement=True, the streaming config, the HF/OSS weight
# fallback), just runnable from a script instead of clicking through
# notebook cells by hand. Executed remotely via `colab exec -f`, which
# transmits this file's text to a real Jupyter kernel on the Colab VM, so
# the IPython `!shell` and `{var}` interpolation below work the same way
# they do in a notebook cell.
#
# Usage (from WSL, with google-colab-cli installed and authenticated --
# see babylon-clay-scene/ANIMATION_PIPELINE.md Section 6 for the one-time
# setup):
#
#   colab new -s lam --gpu T4
#   colab upload -s lam ./altaforte.wav /content/altaforte.wav   # repeat per clip
#   colab exec -s lam -f lam_audio2expression_colab.py
#   colab download -s lam /content/LAM_Audio2Expression/exp/audio2exp_altaforte/altaforte.json ./altaforte.json
#   colab stop -s lam
#
# A `colab new` session stays up on its own until explicitly stopped
# (unlike `colab run`'s ephemeral one-shot VMs, which is where --keep
# actually applies -- there's no such flag on `colab new`). So a second
# colab exec call against the same session skips the venv/clone/deps/
# weights setup (already done) and goes straight to inference on whatever
# new .wav files were uploaded since.

import glob
import os

# 1. Confirm the GPU is attached -- fails loudly below if this doesn't
# show a real accelerator, since every later step assumes CUDA is present.
get_ipython().system('nvidia-smi')

# 2. Clone LAM's repo if this session doesn't already have it.
if not os.path.isdir("/content/LAM_Audio2Expression"):
    os.chdir("/content")
    get_ipython().system('git clone https://github.com/aigc3d/LAM_Audio2Expression.git')
os.chdir("/content/LAM_Audio2Expression")

# 3. Python 3.10 + an isolated venv (LAM only supports 3.10; Colab's
# default system Python is newer by now). Skipped if a prior run on this
# same --keep session already built it.
PY = "/content/lam_env/bin/python"
PIP = "/content/lam_env/bin/pip"

if not os.path.exists(PY):
    get_ipython().system(
        'apt-get install -y python3.10 python3.10-venv python3.10-distutils 2>/dev/null '
        '|| (sudo add-apt-repository -y ppa:deadsnakes/ppa && apt-get update '
        '&& apt-get install -y python3.10 python3.10-venv python3.10-distutils)'
    )
    get_ipython().system('python3.10 -m venv /content/lam_env')

    get_ipython().system(f'{PIP} install --upgrade pip')
    # Colab's T4/L4 GPUs run CUDA 12.x drivers, matching install_cu121.sh:
    get_ipython().system(
        f'{PIP} install torch==2.1.2 torchvision==0.16.2 torchaudio==2.1.2 '
        '--index-url https://download.pytorch.org/whl/cu121'
    )
    get_ipython().system(f'{PIP} install -r requirements.txt')
    get_ipython().system(f'{PIP} install wheels/gradio_gaussian_render-0.0.3-*.whl')

# 4. Model weights + assets (HuggingFace first, OSS mirror fallback).
# Skipped if a prior run on this session already pulled them down.
WEIGHT_PATH = "pretrained_models/lam_audio2exp_streaming.tar"

if not os.path.exists(WEIGHT_PATH):
    get_ipython().system(f'{PIP} install -q huggingface_hub')
    get_ipython().system(f'/content/lam_env/bin/huggingface-cli download 3DAIGC/LAM_audio2exp --local-dir ./')
    if os.path.exists("LAM_audio2exp_assets.tar"):
        get_ipython().system('tar -xzvf LAM_audio2exp_assets.tar && rm -f LAM_audio2exp_assets.tar')
    if os.path.exists("LAM_audio2exp_streaming.tar"):
        get_ipython().system('tar -xzvf LAM_audio2exp_streaming.tar && rm -f LAM_audio2exp_streaming.tar')

    if not os.path.exists(WEIGHT_PATH):
        print("HuggingFace path didn't produce the weights -- falling back to the OSS mirror")
        get_ipython().system(
            'wget -q https://virutalbuy-public.oss-cn-hangzhou.aliyuncs.com/share/aigc3d/data/LAM/LAM_audio2exp_assets.tar'
        )
        get_ipython().system('tar -xzvf LAM_audio2exp_assets.tar && rm -f LAM_audio2exp_assets.tar')
        get_ipython().system(
            'wget -q https://virutalbuy-public.oss-cn-hangzhou.aliyuncs.com/share/aigc3d/data/LAM/LAM_audio2exp_streaming.tar'
        )
        get_ipython().system('tar -xzvf LAM_audio2exp_streaming.tar && rm -f LAM_audio2exp_streaming.tar')

if not os.path.exists(WEIGHT_PATH):
    raise SystemExit(f"Weights still missing at {WEIGHT_PATH} after both download paths -- check the output above")

# 5. Run inference on every .wav uploaded into /content (via `colab
# upload` before this script runs -- see the usage comment up top). Reads
# straight from /content by absolute path rather than requiring clips to
# be pre-placed inside the cloned repo folder, since that folder may not
# exist yet the first time a clip gets uploaded.
#
# brow_movement=True: adopted 2026-10-23, confirmed real effect across all
# clips tested. movement_smooth=True was tried 2026-10-27 and dropped --
# no measurable effect. id_idx is the one remaining untried knob -- see
# docs/FACIAL_ANIM_REGEN_NOTES.md.
wav_paths = sorted(glob.glob("/content/*.wav"))
if not wav_paths:
    raise SystemExit(
        "No .wav files found in /content -- upload clips first with "
        "`colab upload -s <session> ./clip.wav /content/clip.wav`"
    )

for wav_path in wav_paths:
    clip_name = os.path.splitext(os.path.basename(wav_path))[0]
    save_path = f"exp/audio2exp_{clip_name}"
    json_path = f"{save_path}/{clip_name}.json"
    print(f"\n=== {wav_path} -> /content/LAM_Audio2Expression/{json_path} ===")

    get_ipython().system(
        f'{PY} inference.py --config-file configs/lam_audio2exp_config_streaming.py '
        f'--options save_path={save_path} save_json_path={json_path} '
        f'weight={WEIGHT_PATH} audio_input={wav_path} brow_movement=True'
    )

    if os.path.exists(json_path):
        print(f"OK: {json_path} -- pull it back with "
              f"`colab download -s <session> /content/LAM_Audio2Expression/{json_path} ./{clip_name}.json`")
    else:
        print(f"WARNING: expected output not found at {json_path} -- inference likely failed for "
              f"this clip, check the log above before trusting any other output")
