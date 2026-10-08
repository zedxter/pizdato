#!/usr/bin/env bash
set -euo pipefail
umask 077
export TZ=Europe/Berlin
RUNNER_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
VAULT="${PIZDATO_MORNING_VAULT:-/home/danil/vault/pizdato}"
STATE="${PIZDATO_MORNING_STATE:-$HOME/.local/state/pizdato-morning}"
DAY="$(date +%F)"
MARKER="$VAULT/published/telegram/morning-$DAY.md"
MODE="${1:-publish}"
case "$MODE" in
  publish|--dry-run|--check) ;;
  *) echo "Usage: $0 [--dry-run|--check]" >&2; exit 2 ;;
esac
NODE="${PIZDATO_MORNING_NODE:-/usr/bin/node}"
mkdir -p "$STATE"
exec 9>"$STATE/run.lock"
if ! flock -n 9; then
  echo "Another morning run is active; skipping."
  exit 0
fi
if [[ "$MODE" == publish && -f "$MARKER" ]]; then
  echo "Already published for $DAY; skipping."
  exit 0
fi

if [[ "$MODE" == publish && -f "$STATE/morning-$DAY.pending" ]]; then
  echo "ERROR: Unresolved send for $DAY; reconcile the channel before retry." >&2
  exit 1
fi
export PIZDATO_MORNING_VAULT="$VAULT"
export PIZDATO_MORNING_STATE="$STATE"
/usr/bin/timeout --kill-after=30s 20m "$NODE" "$RUNNER_DIR/agent.mjs" "$MODE"
if [[ "$MODE" == publish && ! -s "$MARKER" ]]; then
  echo "ERROR: Runtime finished without a publication marker for $DAY." >&2
  exit 1
fi
