#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"

sync_down() {
  echo "[start:dev] Pulling latest changes..."
  cd "$REPO_ROOT"
  git pull --rebase --autostash || echo "[start:dev] Pull failed, continuing with local state"
  cd "$APP_DIR"
  echo "[start:dev] Installing dependencies..."
  npm install --legacy-peer-deps
}

sync_up() {
  echo ""
  echo "[start:dev] Syncing changes up..."
  cd "$REPO_ROOT"

  if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
    echo "[start:dev] No changes to push."
    return
  fi

  git add -A
  SUMMARY=$(git diff --cached --stat | tail -1)
  git commit -m "auto: dev session sync

$SUMMARY" || true
  git push || echo "[start:dev] Push failed -- run 'git push' manually."
  echo "[start:dev] Changes pushed."
}

cleanup() {
  echo ""
  echo "[start:dev] Dev server stopped."
  sync_up
  exit 0
}

trap cleanup SIGINT SIGTERM

sync_down

echo "[start:dev] Starting dev server..."
npx vite &
VITE_PID=$!
wait $VITE_PID
