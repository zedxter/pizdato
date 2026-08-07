#!/usr/bin/env bash
# Online SQLite backup via .backup (safe with WAL). Keeps the newest N copies.
set -euo pipefail

DB="${PIZDATO_DB:-/var/lib/pizdato/votes.db}"
BACKUP_DIR="${PIZDATO_BACKUP_DIR:-/var/lib/pizdato/backups}"
KEEP="${PIZDATO_BACKUP_KEEP:-7}"

if [[ ! -f "$DB" ]]; then
  echo "database not found: $DB" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
stamp="$(date -u +%Y%m%d-%H%M%S)"
out="$BACKUP_DIR/votes-$stamp.db"

sqlite3 "$DB" ".timeout 5000" ".backup '$out'"
chmod 640 "$out" 2>/dev/null || true

# Keep only the newest KEEP backups.
mapfile -t old < <(ls -1t "$BACKUP_DIR"/votes-*.db 2>/dev/null | tail -n +"$((KEEP + 1))" || true)
if ((${#old[@]} > 0)); then
  rm -f "${old[@]}"
fi

echo "backup ok: $out"
