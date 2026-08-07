#!/usr/bin/env bash
# Run sqlite3 against the production DB safely: stop API first, then start it again.
# Usage:
#   sudo ./deploy/db-admin.sh 'SELECT COUNT(*) FROM votes;'
#   sudo ./deploy/db-admin.sh -header -column 'PRAGMA journal_mode;'
set -euo pipefail

if [[ -n "${SUDO_ASKPASS:-}" && "${EUID:-$(id -u)}" -ne 0 ]]; then
  exec sudo -A "$0" "$@"
fi

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "Run as root (or with sudo)." >&2
  exit 1
fi

DB=/var/lib/pizdato/votes.db
SERVICE=pizdato

if [[ $# -eq 0 ]]; then
  echo "Usage: $0 [sqlite3 args...] <sql>" >&2
  echo "Example: $0 'SELECT COUNT(*) FROM votes;'" >&2
  exit 1
fi

cleanup() {
  systemctl start "$SERVICE" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "==> Stopping $SERVICE"
systemctl stop "$SERVICE"

echo "==> Running sqlite3 on $DB"
sudo -u pizdato sqlite3 "$DB" "$@"

echo "==> Starting $SERVICE"
systemctl start "$SERVICE"
trap - EXIT
