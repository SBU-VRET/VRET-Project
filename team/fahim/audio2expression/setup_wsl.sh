#!/usr/bin/env bash
# One-time WSL-side (Ubuntu) setup for the LAM Audio2Expression Colab
# automation. Run this after setup_windows.ps1 has WSL + Ubuntu ready, or
# directly if you already have WSL2 + Ubuntu working.
#
# Installs: python3-pip/venv, a dedicated venv at ~/colab-cli-env,
# google-colab-cli, and keyrings.alt (required -- without it, python's
# `keyring` has no usable backend in a bare WSL install, and the OAuth
# login silently fails to persist, forcing a fresh login on every run).
#
# Does NOT do the actual Google login -- that's a one-time manual step
# since it needs your own Google account/browser, printed at the end of
# this script.

set -euo pipefail

echo "== Installing system packages (python3-pip, python3-venv) =="
sudo apt-get update -qq
sudo apt-get install -y -qq python3-pip python3-venv

VENV="$HOME/colab-cli-env"
if [ ! -d "$VENV" ]; then
    echo "== Creating venv at $VENV =="
    python3 -m venv "$VENV"
else
    echo "== Reusing existing venv at $VENV =="
fi

# shellcheck disable=SC1090
source "$VENV/bin/activate"

echo "== Installing/upgrading google-colab-cli and keyrings.alt =="
pip install --upgrade pip -q
pip install --upgrade google-colab-cli keyrings.alt -q

echo ""
echo "== Installed versions =="
colab version

echo ""
echo "== One remaining manual step: Google login =="
echo "Run this, then open the URL it prints, log in with the Google account"
echo "that should run/bill the Colab compute, approve, and paste the"
echo "authorization code back into this terminal:"
echo ""
echo "  source $VENV/bin/activate"
echo "  colab sessions"
echo ""
echo "This only needs to be done once -- the token persists in"
echo "~/.config/colab-cli/ from here on, thanks to keyrings.alt above."
