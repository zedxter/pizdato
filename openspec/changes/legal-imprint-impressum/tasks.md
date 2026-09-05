## 1. Template Page

- [ ] 1.1 Create `frontend/public/imprint.html` — static HTML template in Russian with placeholders for: operator name/address, contact email, VAT ID, Chamber of Commerce Potsdam registration (if applicable), legal form, managing director, regulatory references (§5 DDG)
- [ ] 1.2 Follow the existing `privacy.html` design conventions (doctype, meta tags, structure, dark theme via `design.css` classes)

## 2. Navigation & Caddy

- [ ] 2.1 Add `'imprint'` to the `NavId` type and a `{ id: 'imprint', href: '/imprint', label: 'Импрессум' }` entry to `NAV_LINKS` in `frontend/src/nav.ts`
- [ ] 2.2 Add `/imprint` to the `@html_routes` set in `deploy/Caddyfile` so the page gets `Cache-Control: no-cache`
- [ ] 2.3 Run `npm run build` and confirm the static file is included in `frontend/dist/`

## 3. Verification

- [ ] 3.1 Preview: `curl http://localhost:8080/imprint` returns 200 with correct content-type `text/html`
- [ ] 3.2 Footer link is visible on every page (`/`, `/lenta`, `/faq`, `/articles`, `/issledovanie`, `/pizdato`)