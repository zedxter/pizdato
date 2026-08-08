#!/usr/bin/env bash
set -euo pipefail

# Prefer askpass when available (non-interactive / Cursor agent)
if [[ -n "${SUDO_ASKPASS:-}" ]]; then
  sudo() { command sudo -A "$@"; }
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_DIST="$ROOT/frontend/dist"
BACKEND_BIN="$ROOT/target/release/backend"

echo "==> Building frontend"
cd "$ROOT/frontend"
npm ci
npm run build

echo "==> Building backend"
cd "$ROOT"
cargo build -p backend --release

echo "==> Ensuring system user"
if ! id pizdato >/dev/null 2>&1; then
  sudo useradd --system --home /opt/pizdato --shell /usr/sbin/nologin pizdato
fi

echo "==> Installing files"
sudo install -d -o pizdato -g pizdato -m 770 /var/lib/pizdato /var/lib/pizdato/backups
sudo install -d /opt/pizdato /var/www/pizdato /var/log/caddy
sudo install -m 755 "$BACKEND_BIN" /opt/pizdato/backend
sudo install -m 755 "$ROOT/deploy/db-admin.sh" /opt/pizdato/db-admin.sh
sudo install -m 755 "$ROOT/deploy/backup-db.sh" /opt/pizdato/backup-db.sh
sudo find /var/www/pizdato -mindepth 1 -delete
sudo cp -a "$FRONTEND_DIST"/. /var/www/pizdato/
sudo install -m 644 "$ROOT/deploy/pizdato.service" /etc/systemd/system/pizdato.service
sudo install -m 644 "$ROOT/deploy/pizdato-backup.cron" /etc/cron.d/pizdato-backup
sudo touch /var/log/pizdato-backup.log
sudo chown pizdato:pizdato /var/log/pizdato-backup.log

# Channel hourly cron (deploy user) writes news_items + system votes into the same DB.
DEPLOY_USER="${PIZDATO_DEPLOY_USER:-${SUDO_USER:-}}"
if [[ -n "$DEPLOY_USER" && "$DEPLOY_USER" != "root" ]] && getent group pizdato >/dev/null 2>&1; then
  if ! id -nG "$DEPLOY_USER" | tr ' ' '\n' | grep -qx pizdato; then
    sudo usermod -aG pizdato "$DEPLOY_USER"
    echo "Added $DEPLOY_USER to group pizdato"
  fi
fi
if [[ -f /var/lib/pizdato/votes.db ]]; then
  sudo chown pizdato:pizdato /var/lib/pizdato/votes.db
  sudo chmod 660 /var/lib/pizdato/votes.db
fi

if [[ ! -f /etc/pizdato.env ]]; then
  SALT="$(openssl rand -hex 32)"
  sudo tee /etc/pizdato.env >/dev/null <<EOF
BIND=127.0.0.1:8080
DATABASE_URL=sqlite:/var/lib/pizdato/votes.db?mode=rwc
COOKIE_SECURE=true
VOTE_IP_SALT=${SALT}
VOTE_IP_DAILY_LIMIT=100
VOTE_IP_MIN_INTERVAL_SECS=10
VOTE_SESSION_MIN_AGE_SECS=2
RUST_LOG=info
EOF
  sudo chmod 600 /etc/pizdato.env
  echo "Created /etc/pizdato.env"
fi

echo "==> Configuring Caddy"
sudo install -d -o caddy -g caddy /var/log/caddy
sudo rm -f /var/log/caddy/pizdato-access.log
sudo -u caddy touch /var/log/caddy/pizdato-access.log
sudo cp /etc/caddy/Caddyfile "/etc/caddy/Caddyfile.bak.$(date +%s)" 2>/dev/null || true
sudo install -m 644 "$ROOT/deploy/Caddyfile" /etc/caddy/Caddyfile

sudo systemctl daemon-reload
sudo systemctl enable --now pizdato
sudo systemctl reload caddy || sudo systemctl restart caddy

echo "==> Done. https://pizdato.net (Caddy handles TLS automatically)"
echo "    DB backups: /var/lib/pizdato/backups (cron 03:15)"
echo "    Access log: /var/log/caddy/pizdato-access.log"
