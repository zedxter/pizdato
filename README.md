<p align="center">
  <img src="frontend/public/logo.png" alt="pizdato.net" width="180" />
</p>

# Pizdato

**Site:** [pizdato.net](https://pizdato.net) · **Telegram:** [@pizdato_net](https://t.me/pizdato_net)

Voting site for [pizdato.net](https://pizdato.net): two buttons — **Сделать пиздато** / **Сделать хуёво** — with live counts, a wisdom quote carousel after voting, share/badge flow («Кинь другу»), and a small set of crawlable content pages under one top nav.

One meaningful vote per visitor is enforced with a soft anti-abuse layer (HTTP-only cookie session + hashed IP limits; no captcha/login).

## Stack

- **Frontend:** React + Vite (TypeScript), multi-page HTML shells
- **Backend:** Rust (Axum) + SQLite
- **MCP:** public Streamable HTTP endpoint (read-only stats)
- **Deploy:** Caddy + systemd (+ channel cron for hourly news votes)

## Pages

| URL | Page | What it is |
|-----|------|------------|
| [/](https://pizdato.net/) | Голосование | Brand, two buttons, one vote; after vote — quote carousel, % bars, share |
| [/lenta](https://pizdato.net/lenta) | Лента | Infinite scroll of news verdicts that moved the global score (title, thumbnail, пиздато/хуёво, reason) |
| [/pizdato](https://pizdato.net/pizdato) | Пиздато | What the word means + how votes and news feed the same counter |
| [/issledovanie](https://pizdato.net/issledovanie) | Эссе | Longer piece on binary oppositions (добро/зло → пиздато/хуёво) |
| [/faq](https://pizdato.net/faq) | FAQ | Short answers: one vote, cookies/anti-abuse, Telegram, MCP, sharing |

Navigation: shared top menu + matching footer on every page (Голосование · Лента · Пиздато · Эссе · FAQ · Telegram).

### Home UX notes

- Vote buttons unlock ~2s after stats load (aligned with session min age)
- After vote: three rotating wisdom quotes in the hero; share panel uses the active quote
- Frontend retries `GET /api/stats` a few times and shows **Обновить** if the API is briefly unavailable

### Feed & news votes

Hourly channel cron picks an absurd/unique story, writes `news_items` + a system vote into the same SQLite DB, and DMs the owner. The public feed is `GET /api/news` (cursor pagination). Thumbnails come from RSS/OG (`image_url`); missing images fall back to the site logo.

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

Open http://localhost:5173 — Vite proxies `/api` to the backend and maps clean paths (`/lenta`, `/pizdato`, …) to their HTML entries. For local MCP, point the client at `http://127.0.0.1:8080/mcp`.

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/stats` | Issues/resumes `voter_id` cookie + session; returns counts and whether this client already voted |
| `POST` | `/api/vote` | Body `{ "choice": "pizdato" \| "huyevo" }` |
| `GET` | `/api/news` | Public feed from `news_items`; cursor `before_id`, `limit` (default 20, max 50); items include optional `image_url` |

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

Technical SEO: `robots.txt`, `sitemap.xml`, Open Graph, JSON-LD (`WebSite` / `Organization` / page types), canonicals, shared nav for internal links.

Crawlable shells (Caddy `try_files … {path}.html`):

| Path | Shell | Notes |
|------|-------|--------|
| `/` | `index.html` | Vote page; title starts with «Пиздато» |
| `/pizdato` | `pizdato.html` | Brand + mechanics; FAQPage JSON-LD (`/how` → 301 here) |
| `/lenta` | `lenta.html` | `CollectionPage`; list loads via `GET /api/news` |
| `/articles` | `articles.html` | Articles index (`CollectionPage`) |
| `/articles/*` | `articles/*.html` | Short articles (`Article` JSON-LD) |
| `/issledovanie` | `issledovanie.html` | Article + BreadcrumbList; illustrated essay |
| `/faq` | `faq.html` | `FAQPage` JSON-LD |

Sitemap: [https://pizdato.net/sitemap.xml](https://pizdato.net/sitemap.xml)

### Indexing checklist (Google + Yandex)

Do this after each meaningful SEO deploy (manual, needs your login):

1. [Google Search Console](https://search.google.com/search-console) — property `https://pizdato.net/`
2. Submit sitemap: `https://pizdato.net/sitemap.xml`
3. URL Inspection → request indexing for `/`, `/pizdato`, `/articles`, `/articles/chto-znachit-pizdato`, `/issledovanie`
4. [Yandex Webmaster](https://webmaster.yandex.ru/) — site already has verify file `yandex_6296b9a7f90fa42a.html`
5. Add/refresh sitemap + «Переобход страниц» for the same URLs
6. Keep linking `https://t.me/pizdato_net` from channel posts that also say «пиздато» and `pizdato.net` in the first lines
7. Optional: 1–2 natural external mentions (blog / VC / catalogue) with links to the site and the channel — no PBNs

Ranking for the bare query «пиздато» still depends on competition, links, and time. Brand queries (`пиздато.net`, `pizdato`) should move faster.

### Content roadmap (optional next)

| Path | Role | Notes |
|------|------|--------|
| `/articles` | Articles | Live: word meaning, binary pair, one-vote; add 1–2/month |
| `/mudrost` | Wisdom archive | Rotating/site quotes; shareable permalinks later |
| `/statistika` | Live stats explainer | Aggregates + what the bars mean; link to MCP `/mcp` |

Prefer fewer strong pages over a thin content farm. Ranking still depends on links, demand, and time.

## License

MIT
