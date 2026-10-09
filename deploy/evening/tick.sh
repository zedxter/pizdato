#!/usr/bin/env bash
set -euo pipefail
umask 077
export TZ=Europe/Berlin
RUNNER_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
STATE="${PIZDATO_EVENING_STATE:-$HOME/.local/state/pizdato-evening}"
NODE="${PIZDATO_EVENING_NODE:-/usr/bin/node}"
if [[ "${1:-tick}" == --status ]]; then
  exec "$NODE" "$RUNNER_DIR/cli.mjs" "$@"
fi
# Dry-run/check use no live slot lock or live state writes.
if [[ "${1:-tick}" != --dry-run && "${1:-tick}" != --check ]]; then
  mkdir -p "$STATE"
  exec 9>"$STATE/run.lock"
  if ! flock -n 9; then
    echo "$(date -Is) Another evening activation is active; skipping."
    exit 0
  fi
fi
export PIZDATO_EVENING_STATE="$STATE"
/usr/bin/timeout --kill-after=5s 305s "$NODE" "$RUNNER_DIR/cli.mjs" "$@"
