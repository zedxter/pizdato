#!/usr/bin/env bash
set -euo pipefail

if [[ -n "${SUDO_ASKPASS:-}" ]]; then
  sudo() { command sudo -A "$@"; }
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/deploy/channel"
DEST=/opt/pizdato/channel

DEPLOY_USER="${PIZDATO_DEPLOY_USER:-${SUDO_USER:-}}"
if [[ -z "$DEPLOY_USER" || "$DEPLOY_USER" == "root" ]]; then
  echo "Set PIZDATO_DEPLOY_USER to the login that owns the Telegram session." >&2
  exit 1
fi
DEPLOY_HOME="$(getent passwd "$DEPLOY_USER" | cut -d: -f6)"
if [[ -z "$DEPLOY_HOME" ]]; then
  echo "Unknown user: $DEPLOY_USER" >&2
  exit 1
fi
NODE_BIN="$(sudo -u "$DEPLOY_USER" bash -lc 'command -v node' || true)"
if [[ -z "$NODE_BIN" ]]; then
  echo "node not found on PATH for user $DEPLOY_USER" >&2
  exit 1
fi

echo "==> Installing channel daily poster (user=$DEPLOY_USER)"
sudo install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$DEST"
sudo find "$DEST" -mindepth 1 -delete
sudo cp -a "$SRC"/. "$DEST"/
sudo rm -rf "$DEST/node_modules"
sudo chown -R "$DEPLOY_USER:$DEPLOY_USER" "$DEST"
sudo -u "$DEPLOY_USER" bash -lc "cd '$DEST' && npm ci --omit=dev"

sudo tee /etc/cron.d/pizdato-channel >/dev/null <<EOF
# Daily posts to Telegram channel @pizdato_net (server TZ: Europe/Berlin)
SHELL=/bin/bash
PATH=$(dirname "$NODE_BIN"):/usr/local/bin:/usr/bin:/bin
MAILTO=""

# Morning: live stats + wisdom
0 10 * * * $DEPLOY_USER cd $DEST && $NODE_BIN post-daily.mjs >> /var/log/pizdato-channel.log 2>&1

# Evening: hot news as пиздато / хуёво
0 17 * * * $DEPLOY_USER cd $DEST && $NODE_BIN post-evening.mjs >> /var/log/pizdato-channel.log 2>&1
EOF
sudo chmod 644 /etc/cron.d/pizdato-channel

sudo touch /var/log/pizdato-channel.log
sudo chown "$DEPLOY_USER:$DEPLOY_USER" /var/log/pizdato-channel.log

echo "==> Channel poster installed"
echo "    Peer: @pizdato_net"
echo "    Cron: 10:00 stats+wisdom, 17:00 news take (Europe/Berlin)"
echo "    Manual: cd $DEST && node post-daily.mjs | node post-evening.mjs"
echo "    Secrets: $DEPLOY_HOME/.config/telegram-mcp.env + $DEPLOY_HOME/.config/pizdato-channel.env"
echo "    See: $SRC/pizdato-channel.env.example"
