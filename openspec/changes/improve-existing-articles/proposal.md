## Why

Three short brand articles (`chto-znachit-pizdato`, `pizdato-i-huyevo`, `zachem-odin-golos`) are thin as search landings: weak query coverage and little reason to stay. The longer pieces (`sindrom`, `tonkaya-gran`) are stronger but still have soft spots. We need clearer voice (no metaphor mush), tighter SEO meta, and better internal linking — without changing slugs or shipping a new weekly magnet.

## What Changes

- Strong rewrite of the three short articles (slightly longer, one clear argument line each).
- Polish of `sindrom-otlozhennoj-zhizni` and `tonkaya-gran-mezhdu-pizdato-i-pizdec` (structure, H2 clarity, meta).
- Refresh `title` / `dek` / `description` / `keywords` / `dateModified` / `readingMinutes` for all five; keep dual CTA; keep slugs.
- Rebuild SEO shells + deploy.
- Non-goals: new magnet, TG teaser for this rewrite, slug changes, Webmaster ops.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `content-magnet`: Add clarity / single-thread prose bar and require SEO meta (title/description) to match the article’s primary search intent.
- `seo-indexability`: Clarify that when article content is materially updated, meta description and structured-data description MUST stay aligned with the revised body (not stale blurbs).

## Impact

- `frontend/src/articles.ts` (primary).
- Article HTML shells via `npm run sync:articles` / build; deploy to `/var/www/pizdato`.
- Parallel to active `yandex-content-magnet` (cadence/ops); this change is editorial quality on existing URLs only.
