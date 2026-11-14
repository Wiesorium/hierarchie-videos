#!/usr/bin/env bash
# Einmal pro Lauf: Abhängigkeiten installieren (Node-Canvas, Audio-Werkzeuge).
set -euo pipefail
cd "$(dirname "$0")"
command -v ffmpeg >/dev/null || { echo "ffmpeg fehlt"; exit 1; }
npm ci --silent --no-audit --no-fund
python3 -m pip install --quiet --break-system-packages numpy scipy soundfile pyloudnorm pillow fonttools >/dev/null 2>&1 || \
  python3 -m pip install --quiet numpy scipy soundfile pyloudnorm pillow fonttools
node -e "require('@napi-rs/canvas'); console.log('canvas ok')"
python3 -c "import numpy, scipy, soundfile, pyloudnorm, PIL; print('python ok')"
