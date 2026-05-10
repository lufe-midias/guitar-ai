#!/usr/bin/env bash
# Build a fully self-contained Guitar AI .dmg.
# Steps:
#   1. PyInstaller bundles the Python engine into apps/engine/dist/
#   2. electron-builder packages the Electron UI + bundled engine into a .dmg
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "── 1/2 · Bundling Python engine via PyInstaller ──"
cd "$ROOT/apps/engine"
source .venv/bin/activate
python build_engine.py

echo
echo "── 2/2 · Building .dmg via electron-builder ──"
cd "$ROOT/apps/desktop"
npm run package

echo
echo "✓ Release ready:"
ls -lh "$ROOT/apps/desktop/release/"*.dmg
