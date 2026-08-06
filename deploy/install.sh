#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_DIST="$ROOT/frontend/dist"
BACKEND_BIN="$ROOT/backend/target/release/backend"

echo "==> Building frontend"
cd "$ROOT/frontend"
npm ci
npm run build

echo "==> Building backend"
cd "$ROOT/backend"
cargo build --release

echo "==> Ensuring system user"
if ! id pizdato >/dev/null 2>&1; then
  sudo useradd --system --home /opt/pizdato --shell /usr/sbin/nologin pizdato
fi

echo "==> Installing files"
sudo install -d -o pizdato -g pizdato /var/lib/pizdato
sudo install -d /opt/pizdato /var/www/pizdato
sudo install -m 755 "$BACKEND_BIN" /opt/pizdato/backend
sudo rsync -a --delete "$FRONTEND_DIST"/ /var/www/pizdato/
sudo install -m 644 "$ROOT/deploy/pizdato.service" /etc/systemd/system/pizdato.service

if [[ ! -f /etc/pizdato.env ]]; then
  SALT="$(openssl rand -hex 32)"
  sudo tee /etc/pizdato.env >/dev/null <<EOF
BIND=127.0.0.1:8080
DATABASE_URL=sqlite:/var/lib/pizdato/votes.db?mode=rwc
VOTE_IP_SALT=${SALT}
COOKIE_SECURE=true
RUST_LOG=info
EOF
  sudo chmod 600 /etc/pizdato.env
  echo "Created /etc/pizdato.env with a fresh VOTE_IP_SALT"
fi

echo "==> Configuring Caddy"
sudo install -m 644 "$ROOT/deploy/Caddyfile" /etc/caddy/Caddyfile

sudo systemctl daemon-reload
sudo systemctl enable --now pizdato
sudo systemctl reload caddy || sudo systemctl restart caddy

echo "==> Done. https://pizdato.net (Caddy handles TLS automatically)"
