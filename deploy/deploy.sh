#!/usr/bin/env bash
# Deploy pizdato backend + frontend image (GHCR:sha) onto this VPS.
# Both backend API and frontend static files are served by the Docker container.
set -euo pipefail

cd /srv/pizdato/deploy

# ── Pre-deploy SQLite backup (rolling 14 days) ────────────────────────────
DB="${PIZDATO_DB:-/var/lib/pizdato/votes.db}"
BACKUP_DIR="${PIZDATO_BACKUP_DIR:-/var/lib/pizdato/backups}"
KEEP="${PIZDATO_BACKUP_KEEP:-14}"

if [[ -f "$DB" ]]; then
  mkdir -p "$BACKUP_DIR"
  stamp="$(date -u +%Y%m%d-%H%M%S)"
  out="$BACKUP_DIR/votes-$stamp.db"
  sqlite3 "$DB" ".timeout 5000" ".backup '$out'"
  chmod 640 "$out" 2>/dev/null || true
  mapfile -t old < <(ls -1t "$BACKUP_DIR"/votes-*.db 2>/dev/null | tail -n +"$((KEEP + 1))" || true)
  if ((${#old[@]} > 0)); then
    rm -f "${old[@]}"
  fi
  echo "backup ok: $out" >&2
else
  echo "WARNING: database not found at $DB — skipping backup" >&2
fi

PREVIOUS=$(grep '^APP_TAG=' .env.deploy 2>/dev/null | cut -d= -f2) || true
export APP_TAG="${APP_TAG:-latest}"
echo "APP_TAG=$APP_TAG" > .env.deploy
echo "deploying APP_TAG=$APP_TAG (previous=$PREVIOUS)" >&2

# Remove orphan containers from previous deployments (prevents port conflict)
docker compose down --remove-orphans 2>/dev/null || true
# Also stop the legacy project (pizdato-api-1 from old deployment location)
docker compose -p pizdato down --remove-orphans 2>/dev/null || true

docker compose pull api
docker compose up -d --wait --wait-timeout 120 api

# Health gate
HEALTH_URL="http://127.0.0.1:8081/health"
healthy=0
for i in $(seq 1 10); do
  if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
    healthy=1; echo "Healthy after ${i}x5s" >&2; break
  fi
  sleep 5
done

if [ "$healthy" != "1" ]; then
  echo "HEALTH FAILED for $APP_TAG" >&2
  # rollback to previous tag (if any)
  if [ -n "$PREVIOUS" ] && [ "$PREVIOUS" != "$APP_TAG" ]; then
    export APP_TAG=$PREVIOUS
    echo "APP_TAG=$PREVIOUS" > .env.deploy
    docker compose up -d --wait --wait-timeout 120 api
    echo "rolled back to $PREVIOUS" >&2
  fi
  exit 1
fi

echo "HEALTHY $APP_TAG" >&2

# ── Caddy config deploy ──────────────────────────────────────────────────
sudo cp /srv/pizdato/deploy/Caddyfile /etc/caddy/conf.d/pizdato.net
sudo caddy reload --config /etc/caddy/Caddyfile
echo "caddy reloaded" >&2

exit 0