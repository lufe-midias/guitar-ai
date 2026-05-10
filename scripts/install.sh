#!/usr/bin/env bash
# First-run installer — sets up Python venv, installs Python + Node deps.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg não encontrado. Instale com: brew install ffmpeg"
  exit 1
fi
if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 não encontrado. Instale com: brew install python@3.12"
  exit 1
fi
if ! command -v node >/dev/null 2>&1; then
  echo "node não encontrado. Instale com: brew install node"
  exit 1
fi

echo "→ engine: criando venv (com system-site-packages para reaproveitar torch)"
cd "$ROOT/apps/engine"
if [ ! -d .venv ]; then
  python3 -m venv --system-site-packages .venv
fi
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e .
# CLIs (without strict version pin)
python -m pip install demucs spotdl

echo "→ desktop: instalando deps Node"
cd "$ROOT/apps/desktop"
npm install

echo
echo "Tudo pronto."
echo "Pra rodar em modo dev:  scripts/dev.sh"
echo "Pra empacotar .dmg:    cd apps/desktop && npm run package"
