# Pizdato

Voting site for [pizdato.net](https://pizdato.net): two buttons — **Сделать пиздато** / **Сделать хуёво** — with live counts and one vote per visitor (unique HTTP-only cookie).

## Stack

- **Frontend:** React + Vite (TypeScript)
- **Backend:** Rust (Axum) + SQLite
- **Deploy:** Caddy + systemd

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
| `GET` | `/api/stats` | Counts + whether this client already voted |
| `POST` | `/api/vote` | Body `{ "choice": "pizdato" \| "huyevo" }` |

Repeat votes return `409`. Soft anti-abuse (no captcha/login):

- Cookie `voter_id` is issued **only** via `GET /api/stats` (page load) and stored in `sessions`
- `POST /api/vote` without a registered cookie is rejected (`403`)
- Hashed IP rate limits: default max **100 votes / IP / day** and min **10s** between votes from the same IP

Env knobs: `VOTE_IP_SALT`, `VOTE_IP_DAILY_LIMIT`, `VOTE_IP_MIN_INTERVAL_SECS`.

## Production deploy

On this VPS (Caddy is already running):

```bash
./deploy/install.sh
```

That builds the app, installs the systemd service, writes `/etc/caddy/Caddyfile`, and reloads Caddy. TLS is automatic via Caddy.

Env file: `/etc/pizdato.env` (see [deploy/pizdato.env.example](deploy/pizdato.env.example)).

## SEO

Technical SEO is set up (`robots.txt`, `sitemap.xml`, Open Graph, JSON-LD, canonical). To appear in search:

1. [Google Search Console](https://search.google.com/search-console) — add `https://pizdato.net/`, submit sitemap `https://pizdato.net/sitemap.xml`
2. [Yandex Webmaster](https://webmaster.yandex.ru/) — same site + sitemap; optional meta verification tag can go in `frontend/index.html`

Ranking still depends on links, demand, and time — this only makes the site crawlable and understandable.

## License

MIT
