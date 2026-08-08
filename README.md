<p align="center">
  <img src="frontend/public/logo.png" alt="pizdato.net" width="180" />
</p>

# Pizdato

**Site:** [pizdato.net](https://pizdato.net) · **Telegram:** [@pizdato_net](https://t.me/pizdato_net)

Voting site for [pizdato.net](https://pizdato.net): two buttons — **Сделать пиздато** / **Сделать хуёво** — with live counts, a wisdom quote after voting, and share/badge flow («Кинь другу»).

One meaningful vote per visitor is enforced with a soft anti-abuse layer (HTTP-only cookie session + hashed IP limits; no captcha/login).

## Stack

- **Frontend:** React + Vite (TypeScript)
- **Backend:** Rust (Axum) + SQLite
- **MCP:** public Streamable HTTP endpoint (read-only stats)
- **Deploy:** Caddy + systemd

## Product surface

- Before vote: brand + tagline + two vote buttons (buttons unlock ~2s after stats load)
- After vote: wisdom quote in the hero, live % bars, share panel with badge preview (Telegram / VK / copy / download / native share)
- Essay: [pizdato.net/issledovanie](https://pizdato.net/issledovanie) — research piece on binary oppositions (linked from the footer)
- FAQ: [pizdato.net/faq](https://pizdato.net/faq) — how voting works, one vote, privacy at a high level
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

Open http://localhost:5173 — Vite proxies `/api` to the backend. For local MCP, point the client at `http://127.0.0.1:8080/mcp`.

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/stats` | Issues/resumes `voter_id` cookie + session; returns counts and whether this client already voted |
| `POST` | `/api/vote` | Body `{ "choice": "pizdato" \| "huyevo" }` |

Notable responses:

- `409` — already voted
- `403` — no/unknown session, daily request budget exhausted, or IP blacklisted
- `429` — session too fresh, or min interval between votes from the same IP

Soft anti-abuse (high level): one meaningful vote per visitor via cookie session + hashed IP rate limits and blacklist; exact knobs live in `deploy/pizdato.env.example`.

## MCP

Public [Model Context Protocol](https://modelcontextprotocol.io/) server on the same backend as the site.

| | |
|--|--|
| **URL** | `https://pizdato.net/mcp` |
| **Transport** | Streamable HTTP |
| **Auth** | none (read-only public data) |

### Tool: `get_stats`

Returns live aggregate vote counts only:

```json
{
  "pizdato": 35,
  "huyevo": 20,
  "total": 55,
  "pizdato_pct": 63.6,
  "huyevo_pct": 36.4
}
```

Does **not** expose voter identities, IPs/hashes, sessions, env, DB paths, or other internals.

### Cursor config

Project file [`.cursor/mcp.json`](.cursor/mcp.json) (or Cursor Settings → MCP):

```json
{
  "mcpServers": {
    "pizdato": {
      "url": "https://pizdato.net/mcp"
    }
  }
}
```

## Production

On the host (Caddy already running):

```bash
./deploy/install.sh
```

Builds frontend/backend, installs the service, wires Caddy (site + `/api` + `/mcp`), TLS via Caddy.

Telegram channel automation (stats, hourly news votes, evening take):

```bash
./deploy/install-channel.sh
```

Public surfaces: [pizdato.net](https://pizdato.net), [t.me/pizdato_net](https://t.me/pizdato_net). Operator layout and env samples live under [`deploy/`](deploy/) — not duplicated here.

## SEO

Technical SEO: `robots.txt`, `sitemap.xml`, Open Graph, JSON-LD, canonicals.

Crawlable shells:

- `/` → `index.html` (vote page meta)
- `/issledovanie` → `issledovanie.html` (Article + BreadcrumbList meta, noscript excerpt)
- `/faq` → `faq.html` (FAQPage JSON-LD); Caddy maps clean URLs via `try_files … {path}.html`

To appear in search:

1. [Google Search Console](https://search.google.com/search-console) — add `https://pizdato.net/`, submit sitemap `https://pizdato.net/sitemap.xml`
2. [Yandex Webmaster](https://webmaster.yandex.ru/) — same site + sitemap

### Content roadmap (next indexable pages)

Same visual language, footer links, dedicated `*.html` shells + sitemap entries:

| Path | Role | Notes |
|------|------|--------|
| `/kak-eto-rabotaet` | How voting works | One vote, session cookie, soft anti-abuse — public copy only |
| `/mudrost` | Wisdom archive | Rotating/site quotes; shareable permalinks later |
| `/statistika` | Live stats explainer | Aggregates + what the bars mean; link to MCP `/mcp` as curiosity |
| `/faq` | Short FAQ | 4–6 questions people actually ask |
| `/issledovanie/*` | Mini-essays | Optional series: like/dislike, equality, carnival language |

Link each new URL from the footer and from Telegram posts (not only the homepage). Prefer fewer strong pages over a thin content farm.

Ranking still depends on links, demand, and time — this only makes the site crawlable and understandable.

## License

MIT
