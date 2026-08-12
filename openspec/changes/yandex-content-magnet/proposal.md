## Why

pizdato.net is technically healthy but almost invisible: sparse search presence, a Telegram channel with a handful of subscribers, and a small vote counter. The product already has a strong brand voice and a working “content → vote / subscribe” pattern (articles + evening TG posts), but most article shells still ship thin HTML to crawlers, and there is no Yandex-first measurement or editorial cadence. We need external traffic (Yandex first), more votes, and more channel subscribers — one funnel, not three separate projects.

## What Changes

- Treat **Yandex** as the primary search surface; keep Google Webmaster as a secondary mirror.
- Build a **content-magnet** loop: weekly topic articles that answer real RU queries, then pivot to the pizdato gesture and dual CTA (vote + TG).
- Keep **TG pulse** (evening разбор + quote + home CTA) as the retention layer that converts readers into subscribers.
- Improve **indexability** so article (and key) pages expose full content to Yandex without relying only on client JS (parity with the “синдром” article model).
- Add **Yandex.Metrica** (and conversion goals for vote + TG outbound) so ranking/behavior work is measurable.
- Align publication ritual: site article → TG teaser → home vote CTA; refresh sitemap/`lastmod` on publish.
- Non-goals for this change: paid ads, Google-first optimization, medical/YMYL “treatment” content, rewriting the vote product itself.

## Capabilities

### New Capabilities

- `seo-indexability`: Crawlable, content-complete pages for Yandex (static HTML / prerender parity, sitemap hygiene, Webmaster rendering posture).
- `content-magnet`: Editorial magnet articles, dual CTA (vote + TG), and weekly cadence rules that preserve brand voice.
- `growth-measurement`: Yandex.Metrica installation and goals for organic → read → vote / subscribe.

### Modified Capabilities

- (none — no existing specs under `openspec/specs/`)

## Impact

- Frontend: article HTML shells, `articles.ts` / Articles UI, possible shared SEO helpers, Metrica snippet, sitemap updates on publish.
- Ops / publishing: Yandex Webmaster checks (index, JS rendering, page check), editorial calendar, TG post ritual (existing channel skill).
- Analytics: Yandex.Metrica (new dependency / counter ID); optional goals wired to vote success and TG link clicks.
- Out of scope systems: vote API semantics, news ingestion pipeline (лента stays a freshness/pulse source, not the primary SEO magnet).
