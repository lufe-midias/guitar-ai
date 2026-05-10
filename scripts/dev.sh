#!/usr/bin/env bash
# Dev launcher — starts engine + UI together.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Engine
(
  cd "$ROOT/apps/engine"
  source .venv/bin/activate
  exec python -m guitar_ai.server
) &
ENGINE_PID=$!

# UI (vite + electron)
(
  cd "$ROOT/apps/desktop"
  GUITAR_AI_NO_SPAWN=1 npm run dev
) &
UI_PID=$!

trap 'echo "Stopping..."; kill $ENGINE_PID $UI_PID 2>/dev/null || true' EXIT INT TERM
wait
