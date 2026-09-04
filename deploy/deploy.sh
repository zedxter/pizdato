#!/usr/bin/env bash
# Deploy pizdato backend + frontend image (GHCR:sha) onto this VPS.
# Assumes: deploy user in docker group, /srv/pizdato has .env + data/,
# /srv/pizdato/deploy has compose.yaml.
# Current systemd backend on 127.0.0.1:8080 stays as fallback until Caddy is switched.
# Frontend dist is extracted from the Docker image and rsynced to webroot.
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

PREVIOUS=$(grep '^APP_TAG=' .env.deploy 2>/dev/null | cut -d= -f2)
export APP_TAG="${APP_TAG:-latest}"
echo "APP_TAG=$APP_TAG" > .env.deploy
echo "deploying APP_TAG=$APP_TAG (previous=$PREVIOUS)" >&2

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

# ── Frontend deploy ──────────────────────────────────────────────────────
# Extract frontend dist from the newly deployed Docker image and rsync to webroot.
# This runs on every deploy, so frontend changes land atomically with backend.
echo "Extracting frontend dist from ghcr.io/zedxter/pizdato-backend:${APP_TAG}" >&2
WEBROOT=/var/www/pizdato
INCOMING=/srv/pizdato/incoming

EXTRACT_CONTAINER=$(docker create "ghcr.io/zedxter/pizdato-backend:${APP_TAG}")
docker cp "${EXTRACT_CONTAINER}:/frontend/dist" "${INCOMING}" 2>/dev/null || {
  docker rm "${EXTRACT_CONTAINER}" >/dev/null
  echo "WARNING: /frontend/dist not found in image — skipping frontend deploy" >&2
}
docker rm "${EXTRACT_CONTAINER}" >/dev/null

if [ -d "${INCOMING}/dist" ] && [ -f "${INCOMING}/dist/index.html" ]; then
  rsync -a --delete "${INCOMING}/dist/" "${WEBROOT}/"
  chmod -R a+rX "${WEBROOT}"
  echo "frontend deployed: $(ls "${WEBROOT}/index.html")" >&2
elif [ -d "${INCOMING}" ] && [ -f "${INCOMING}/index.html" ]; then
  rsync -a --delete "${INCOMING}/" "${WEBROOT}/"
  chmod -R a+rX "${WEBROOT}"
  echo "frontend deployed (flat): $(ls "${WEBROOT}/index.html")" >&2
else
  echo "WARNING: no index.html found in extracted frontend — webroot unchanged" >&2
fi

# ── Post-deploy content verification ──────────────────────────────────────
echo "Verifying deployed content..." >&2
VERIFY_ERROR=0

# Check that design.css exists in webroot
if [ ! -f "${WEBROOT}/design.css" ]; then
  echo "ERROR: design.css missing from webroot" >&2
  VERIFY_ERROR=1
fi

# Verify key pages serve correct content by checking their <title> tags
declare -A TITLE_CHECKS=(
  ["pizdato.html"]="Пиздато — что это и как работает"
  ["issledovanie.html"]="Пиздато и хуёво: исследование"
  ["faq.html"]="FAQ — частые вопросы"
)
for FILENAME in "${!TITLE_CHECKS[@]}"; do
  FILE="${WEBROOT}/${FILENAME}"
  if [ ! -f "$FILE" ]; then
    echo "ERROR: ${FILENAME} missing from webroot" >&2
    VERIFY_ERROR=1
  elif ! grep -q "<title>${TITLE_CHECKS[$FILENAME]}" "$FILE"; then
    echo "ERROR: ${FILENAME} has wrong content (title mismatch)" >&2
    head -20 "$FILE" | grep -i '<title' >&2
    VERIFY_ERROR=1
  fi
done

if [ "$VERIFY_ERROR" != "0" ]; then
  echo "WARNING: some deployed content checks failed — review above" >&2
fi
echo "content verification complete" >&2

echo "HEALTHY $APP_TAG" >&2

# ── Caddy config deploy ──────────────────────────────────────────────────
sudo cp /srv/pizdato/deploy/Caddyfile /etc/caddy/conf.d/pizdato.net
sudo caddy reload --config /etc/caddy/Caddyfile
echo "caddy reloaded" >&2

exit 0