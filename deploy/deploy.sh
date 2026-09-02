#!/usr/bin/env bash
# Deploy pizdato backend + frontend image (GHCR:sha) onto this VPS.
# Assumes: deploy user in docker group, /srv/pizdato has .env + data/,
# /srv/pizdato/deploy has compose.yaml.
# Current systemd backend on 127.0.0.1:8080 stays as fallback until Caddy is switched.
# Frontend dist is extracted from the Docker image and rsynced to webroot.
set -euo pipefail

cd /srv/pizdato/deploy

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

echo "HEALTHY $APP_TAG" >&2

# ── Caddy config deploy ──────────────────────────────────────────────────
sudo cp /srv/pizdato/deploy/Caddyfile /etc/caddy/conf.d/pizdato.net
sudo caddy reload --config /etc/caddy/Caddyfile
echo "caddy reloaded" >&2

exit 0