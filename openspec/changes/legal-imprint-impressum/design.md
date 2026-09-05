## Context

See `proposal.md — Why`. The site has an existing pattern for static legal pages: `privacy.html` lives in `frontend/public/` and is designed to be served at `/privacy` (but currently returns 404 due to a missing Caddy route). The Caddyfile uses `try_files {path} {path}.html {path}/index.html`, so placing `imprint.html` in `frontend/public/` automatically serves it at `/imprint`. Footer navigation is rendered by `SiteFooter.tsx` which iterates over `NAV_LINKS` from `nav.ts`.

## Goals / Non-Goals

**Goals:**
- Static `/imprint` page reachable at `https://pizdato.net/imprint`
- Link in the footer navigation visible on every page
- Legal compliance with §5 DDG

**Non-Goals:**
- No dynamic content, backend API, or DB interaction
- No React component for the imprint — pure static HTML (follows the `privacy.html` pattern)
- No actual legal data spec — the page is a template with placeholders filled by Danil

## Decisions

1. **Static HTML over React component** — The `privacy.html` pattern already exists. Static HTML avoids the React router complexity and works even when JS is disabled. Caddy serves it directly without needing a Vite build entry.

2. **New `NavId` in nav.ts** — The existing MPA routing in `main.tsx` uses the `NavId` type (union of all page ids). Adding `'imprint'` keeps the type system consistent. Despite not being a React SPA page, the footer uses `NAV_LINKS` for rendering, and the link must still appear there.

3. **Footer link only (not the top nav)** — The Imprint is a legal page, not a site section. It belongs in the footer (the conventional location for legal links). The top nav (`SiteNav.tsx`) already renders `NAV_LINKS` in the mobile panel — we add it there too via the existing nav data. The desktop nav stays uncluttered.

4. **Guessable-name `imprint` over `impressum`** — English `imprint` matches the project's GitHub-facing language policy. Caddy's `try_files {path}.html` resolves `/imprint` → `imprint.html`. An alias like `/impressum` → redirect or rewrite can be added later if needed.

5. **Cache-Control: no-cache** — Follows the existing `@html_routes` pattern so nav/label changes aren't stuck in browser cache.

## Risks / Trade-offs

- **[Risk] Danil may not fill in the placeholders** → The PR is explicitly spec-only. Once merged, the implementation PR will contain the template, and the review will confirm placeholders are replaced before deploy.
- **[Risk] Caddy `try_files` may return a wrong content-type for `.html` without the extension** → Already confirmed: Caddy's `file_server` detects `text/html` from the `.html` file extension served via `try_files`.
- **[Trade-off] No redirect from `/impressum` to `/imprint`** → German users may type `/impressum`. If analytics show traffic, add a Caddy redirect in a follow-up.

## Migration Plan

1. Merge spec-PR
2. Implementation PR: create `frontend/public/imprint.html`, edit `nav.ts`, edit `Caddyfile`
3. CI builds, deploy script copies frontend/dist — `imprint.html` is a Vite public asset, bundled automatically
4. Verify: `curl https://pizdato.net/imprint` returns 200
5. Rollback: revert the implementation PR, remove the Caddyfile route addition, remove the nav link

## Open Questions

None.