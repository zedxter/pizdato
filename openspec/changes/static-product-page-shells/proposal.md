## Why

Yandex Webmaster reports the homepage as unavailable to the robot with `N/A (Документ не содержит текст)`. Live `/` returns 200 HTML, but meaningful copy lives only inside `<noscript>` while `#root` is empty — Yandex’s main-page check does not treat that as a document. Magnets already ship full prose in `#root`; product pages do not. Fixing this unblocks indexing of the site’s primary URL after the sitemap re-add.

## What Changes

- Put crawlable static HTML **inside `#root`** on thin product entry points (same pattern as article shells), starting with `/` and covering the other empty-root pages in sitemap: `/pizdato`, `/lenta`, `/articles`, `/faq`, `/issledovanie`.
- Keep existing `<noscript>` fallbacks in sync with that shell text (no content drift).
- Verify with curl (no JS) that `#root` has extractable Russian prose; after deploy, re-check `/` in Yandex Webmaster.
- No change to vote API, React runtime behavior beyond replacing the static shell on mount (already how article shells work), sitemap URL set, or robots rules.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `seo-indexability`: Extend indexability beyond article permalinks so critical product URLs (especially `/`) expose main content in the initial HTML `#root`, not only in `<noscript>` or after client JS.

## Impact

- Frontend static HTML entry points: `frontend/index.html`, `pizdato.html`, `lenta.html`, `articles.html`, `faq.html`, `issledovanie.html` (and any sync helper that regenerates `/articles` if it currently leaves `#root` empty).
- React `createRoot` continues to wipe `#root` on load — no hydration migration.
- Ops: Yandex Webmaster page check / “главная недоступна” after deploy; JS-rendering preference remains a safety net until verified.
