## Context

See proposal.md — Why. Magnets already put full prose in `#root` + matching `<noscript>`; product HTML entry points leave `#root` empty. React boots with `createRoot(...).render(...)`, which replaces `#root` children on load — same as articles today. `frontend/scripts/sync-article-shells.ts` regenerates article permalinks and updates `/articles` noscript list + ItemList, but does not fill `#root` on `articles.html`.

## Goals / Non-Goals

**Goals:**

- Give Yandex extractable document text on `/` and the other sitemap product URLs without requiring JS execution.
- Reuse the proven article-shell pattern: meaningful markup inside `#root`, keep `<noscript>` aligned.
- Keep vote UX unchanged after JS mounts.

**Non-Goals:**

- Full SSR / hydration (`hydrateRoot`), prerender pipeline, or new framework.
- Live stats / feed items / essay full body in the static shell (teaser + links from existing noscript is enough).
- Changing robots, sitemap URL set, Metrika, or vote API.
- Guaranteeing Webmaster UI clears on a deadline (ops re-check only).

## Decisions

1. **Fill `#root` by mirroring existing `<noscript><main>…</main></noscript>` content (adapted markup as needed)**  
   - **Why:** Fastest path to “document has text”; content already written and reviewed.  
   - **Alternative:** Build a richer static home that visually matches the vote UI — rejected for this change (duplication + drift with React `App`).  
   - **Alternative:** Rely only on Webmaster JS rendering — rejected as primary fix (discretionary budget; current dashboard already fails).

2. **Hand-edit static product HTML files; extend sync helper only where it already regenerates content**  
   - **Why:** `/`, `/pizdato`, `/lenta`, `/faq`, `/issledovanie` are not driven by `articles.ts`.  
   - **Exception:** Update `syncArticlesIndex` so `#root` on `articles.html` gets the same list as noscript whenever the helper runs — otherwise the next `npm run sync:articles` would leave `#root` stale/empty again if we only hand-edit once.  
   - **Alternative:** New codegen for all product pages — overkill for six mostly-static files.

3. **Prefer semantic block inside `#root` (`<main>` or page-appropriate landmark) matching noscript**  
   - **Why:** Clear main content signal for crawlers; consistent with article `<article>` in `#root`.  
   - Flash of static content before React paint is acceptable (already true for magnets).

4. **Verification = curl/no-JS text length in `#root` + post-deploy Webmaster re-check of `/`**  
   - **Why:** Matches how we discovered the failure; closes the ops loop in the active Yandex workstream.

## Risks / Trade-offs

- **[FOUC / brief static shell]** → Accept; same as magnets. Keep shell visually simple (prose, not fake vote buttons that look broken).
- **[Content drift between `#root` and noscript]** → For hand-edited pages, edit both in one pass; for `/articles`, sync helper writes both.
- **[Yandex still flags `/` for other reasons]** → Keep JS rendering on; compare page check of `/` vs a magnet after deploy.
- **[Essay / lenta shells stay thin vs full dynamic UI]** → Enough text to defeat “no document text”; not a substitute for full content ranking of those URLs.

## Migration Plan

1. Edit product HTML shells (+ articles sync helper).
2. Build/deploy frontend as usual.
3. Curl-verify `#root` text on listed URLs without assuming JS.
4. In Yandex Webmaster, re-check homepage / clear “главная недоступна”; note result.
5. Rollback = redeploy previous frontend artifact if a shell somehow breaks the app (unlikely: `createRoot` replaces `#root`).
