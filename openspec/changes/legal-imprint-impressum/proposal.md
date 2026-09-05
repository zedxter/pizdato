## Why

pizdato.net is hosted on a German VPS and targets a German-resident audience (Russian-speaking in Germany). German law (§5 DDG, formerly §5 TMG) requires every commercial website to display an Impressum (imprint) with the operator's name, address, and contact details. The site currently has no Impressum — GET /impressum returns 404. Without it the site faces a regulatory fine of up to €50,000.

## What Changes

- Create a static `imprint.html` page in `frontend/public/` — served at `/imprint` by the existing Caddy `try_files` rule
- Add an "Impressum" link to the footer (`SiteFooter.tsx` iterates over `NAV_LINKS`; extend `nav.ts` with a new `NavId` and entry)
- Add `/imprint` to the Caddyfile's `@html_routes` set for `Cache-Control: no-cache` (like the other SPA shells)
- The page content is a template with placeholders — actual legal data (name, address, contact, VAT etc.) filled by site owner Danil

**No backend/API changes.** No database changes. Pure static frontend.

## Capabilities

### New Capabilities

None — this is a legal-compliance layout change (static page + nav link). No new product behaviour, so `skip_specs: true` is set in `.openspec.yaml`.

### Modified Capabilities

None.

## Impact

- **frontend/public/imprint.html** — new static HTML file (template)
- **frontend/src/nav.ts** — add `'imprint'` to `NavId` and a new link entry
- **frontend/src/SiteFooter.tsx** — automatically picks up the new `NAV_LINKS` entry
- **deploy/Caddyfile** — add `/imprint` to `@html_routes`
- No backend, no DB, no API