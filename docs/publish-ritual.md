# Publish ritual (content magnet)

Short checklist for shipping one magnet without breaking SEO shells or the TG loop.

## Site

1. Add/update the article in `frontend/src/articles.ts` (slug, meta, hero image fields, `bodyHtml`).
2. End the body with `MAGNET_DUAL_CTA_HTML` (vote home + `@pizdato_net`) — already exported from `articles.ts`.
3. Drop a hero JPEG under `frontend/public/articles/<slug>.jpg` (same size convention as existing: 1400×933).
4. From `frontend/`: `npm run sync:articles` (or full `npm run build`) — refreshes static HTML shells, sitemap `lastmod`, articles index ItemList.
5. Deploy `frontend/dist/` to the live web root (`/var/www/pizdato` on the server).
6. Curl-verify the new URL returns full prose without assuming JS (title, body, og:image).

## Telegram (same day)

1. Teaser in brand voice (ironic, no moralizing, keep **пиздато** where it matters).
2. Canonical article URL with link preview: `https://pizdato.net/articles/<slug>`
3. Home CTA lines (channel skill):

```
Мир ждёт твоего голоса. Остальное — уже легенда:
https://pizdato.net
```

## After publish

- Metrica: watch article landings, `vote_success`, `telegram_click` for ~7 days.
- Yandex Webmaster: optional re-check of the new URL / sitemap processing.
