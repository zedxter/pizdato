# Pizdato

Voting site for [pizdato.net](https://pizdato.net): two buttons — **Сделать пиздато** / **Сделать хуёво** — with live counts, a wisdom quote after voting, and share/badge flow («Кинь другу»).

One meaningful vote per visitor is enforced with a soft anti-abuse layer (HTTP-only cookie session + hashed IP limits; no captcha/login).

## Stack

- **Frontend:** React + Vite (TypeScript)
- **Backend:** Rust (Axum) + SQLite (WAL, busy timeout, small connection pool)
- **Deploy:** Caddy + systemd

## Product surface

- Before vote: brand + tagline + two vote buttons (buttons unlock ~2s after stats load)
- After vote: wisdom quote in the hero, live % bars, share panel with badge preview (Telegram / VK / copy / download / native share)
- Frontend retries `GET /api/stats` a few times and shows **Обновить** if the API is briefly unavailable

## Development

```bash
# terminal 1
cd backend
cp ../deploy/pizdato.env.example .env   # optional; defaults work for local
# set COOKIE_SECURE=false for local HTTP
cargo run

# terminal 2
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — Vite proxies `/api` to the backend on `:8080`.

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/stats` | Issues/resumes `voter_id` cookie + session; returns counts and whether this client already voted |
| `POST` | `/api/vote` | Body `{ "choice": "pizdato" \| "huyevo" }` |

Notable responses:

- `409` — already voted
- `403` — no/unknown session, daily request budget exhausted, or IP blacklisted
- `429` — session too fresh, or min interval between votes from the same IP

Soft anti-abuse:

- Cookie `voter_id` is issued **only** via `GET /api/stats` and stored in `sessions`
- `POST /api/vote` without a registered session is rejected
- Hashed IP limits (default): **10 vote requests / IP / day** (any outcome), min **10s** between successful votes from the same IP
- After **5** HTTP `403` vote responses from an IP in 24h → IP is **blacklisted**; its votes are excluded from public stats
- Session must be at least **2s** old (`VOTE_SESSION_MIN_AGE_SECS`)
- Stale orphan sessions (no vote, older than ~30 minutes) are pruned on migrate

Env knobs: `VOTE_IP_SALT`, `VOTE_IP_DAILY_LIMIT`, `VOTE_IP_MIN_INTERVAL_SECS`, `VOTE_IP_403_BLACKLIST_AFTER`, `VOTE_SESSION_MIN_AGE_SECS`.

## Production deploy

On the VPS (Caddy already running):

```bash
./deploy/install.sh
```

That builds frontend/backend, installs the systemd unit, wires Caddy, installs the daily DB backup cron, and reloads Caddy. TLS is automatic via Caddy.

Telegram channel daily posts (stats + wisdom):

```bash
./deploy/install-channel.sh
```

| Path | Role |
|------|------|
| https://t.me/pizdato_net | Public channel |
| `/opt/pizdato/channel/` | Daily poster (`post-daily.mjs`, `post-evening.mjs`) |
| `/etc/cron.d/pizdato-channel` | Cron `10:00` stats+wisdom, `17:00` news take (Europe/Berlin) |
| `/var/log/pizdato-channel.log` | Poster log |
| `~/.config/pizdato-channel.env` | Optional overrides + `TELEGRAM_ACCOUNT_ID` (see example); evening posts prefer `cursor-agent -p` |

| Path | Role |
|------|------|
| `/etc/pizdato.env` | Runtime env ([example](deploy/pizdato.env.example)) |
| `/opt/pizdato/backend` | API binary |
| `/opt/pizdato/db-admin.sh` | Run SQL **after stopping** the API (avoids SQLite locks) |
| `/opt/pizdato/backup-db.sh` | Online SQLite `.backup` |
| `/var/lib/pizdato/votes.db` | Database |
| `/var/lib/pizdato/backups/` | Daily backups (cron `03:15`, keeps 7 newest) |
| `/var/www/pizdato` | Static frontend |
| `/var/log/caddy/pizdato-access.log` | Caddy access log (rolled) |

Safe one-off DB work:

```bash
sudo /opt/pizdato/db-admin.sh 'SELECT COUNT(*) FROM votes;'
```

## Ops notes

- Prefer `db-admin.sh` (or `systemctl stop pizdato`) for long `DELETE` / `VACUUM` — concurrent admin + API caused `database is locked` outages before WAL hardening
- SQLite runs with **WAL**, **busy_timeout=5s**, pool size **2**, migrate retries on lock
- Filter API traffic in the access log: `sudo grep '"/api/' /var/log/caddy/pizdato-access.log`

## SEO

Technical SEO is set up (`robots.txt`, `sitemap.xml`, Open Graph, JSON-LD, canonical). To appear in search:

1. [Google Search Console](https://search.google.com/search-console) — add `https://pizdato.net/`, submit sitemap `https://pizdato.net/sitemap.xml`
2. [Yandex Webmaster](https://webmaster.yandex.ru/) — same site + sitemap; optional meta verification tag can go in `frontend/index.html`

Ranking still depends on links, demand, and time — this only makes the site crawlable and understandable.

## License

MIT
