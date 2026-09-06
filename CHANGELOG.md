# Changelog

All notable changes to pizdato.net will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- Welcome/onboarding sequence for @pizdato_net subscribers
- ROADMAP.md (separate from README)
- CONTRIBUTING.md for open-source contributors
- frontend/README.md project-specific documentation

## [2026-09-05]

### Added
- Legal imprint/impressum page template (§5 DDG compliance)
- Gitleaks secret scan workflow
- Pre-deploy SQLite backup with 14-day rolling retention

### Changed
- CI switched to self-hosted runner on VPS
- PR Issue keywords restricted to Closes/Fixes/Resolves only

### Fixed
- 404 page action buttons border-radius token compliance
- Harden CSP and clean up Caddyfile
- Essay pages h1/h2 font token compliance
- Share buttons border-radius token compliance
- Dockerfile design.css path after migration

### Spec
- Constrain confetti palette to DESIGN.md tertiary/danger spectrum
- Legal imprint/impressum page template spec
- Community engagement features (badge gallery, live vote ticker)

## [2026-09-04]

### Added
- Test infrastructure for backend (Rust) and frontend (Vitest)
- X/Twitter share button to SharePanel

### Spec
- Referral/viral loop — proposal, spec, design, tasks
- Community engagement features (badge gallery, live vote ticker)

## [2026-09-03]

### Added
- Cookie consent banner with opt-in Yandex.Metrika
- MIT LICENSE file
- Clippy and fmt gates to CI, pre-existing warnings fixed
- UI pixel validation for key pages (home, feed, article)
- HSTS and X-Frame-Options security headers to Caddyfile
- Content-Security-Policy header to Caddyfile
- Input validation, rate limiting and log sanitization to /api/event endpoint
- DESIGN.md linter CI check
- Design-eval runner for CSS property verification

### Changed
- GDPR-compliant Privacy Notice updated
- Dead MCP handler code removed
- CSS custom property blocks deduplicated in design.css
- Worktree/repo-clone canon added to AGENTS.md
- Migration to design.css classes completed

### Fixed
- WCAG 2.2 minimum touch target size (44x44px) for interactive elements
- Yandex.Metrika Webvisor session recording disabled
- Orphaned keyframe fragment removed from public/design.css
- Missing FAQ items added to SSR fallback in faq.html

### Docs
- Target audience and value proposition documented
- Competitive landscape and market positioning documented
- Promotion strategy for current phase documented

### Ops
- Post-deploy webroot verification for design.css and key pages
- Post-deploy content verification for key pages

## [2026-09-02]

### Added
- Design-eval scenarios for home, feed, article pages
- Product-standards.md for pizdato.net
- AGENTS.md with PR rules and process guidelines
- Caddyfile deploy via CI — reload on deploy
- Design.css included in Docker image for production deploy
- Multi-stage Docker image with frontend + backend, atomic deploy on merge

### Changed
- Frontend migrated to design.css classes
- Pull_request trigger removed from deploy workflow
- Stale systemd service file removed (app runs via Docker now)

### Fixed
- /health handler added to Caddyfile, stale /mcp* block removed

### Spec
- Auto-create implementation Issues on spec PR merge

## [2026-09-01]

### Added
- Public stylesheet design.css with design tokens and component classes
- DESIGN.md with tokens, prose, and anti-patterns

## [2026-08-31]

### Added
- Docker deploy for pizdato backend (multi-stage build)
- OpenSpec config.yaml with project context and rules
- IDD embedded in process documentation

### Fixed
- Dockerfile: use rust:latest (1.85 doesn't support edition 2024 deps)
- Dockerfile: real backend binary (9MB) instead of dummy (450KB)

## [2026-08-29]

### Added
- Dev.to profile cover banner (removed same day — added by mistake)

## [2026-08-28]

### Added
- CI pipeline (cargo check+test, frontend lint+build)
- Share result display in SharePanel with tracking

### Docs
- Product-standards change for pizdato-net

## [2026-08-27]

### Added
- Viral badge — signature, tracking, vertical format, stories button
- 104 new quotes (total 321)
- Subscribe to @pizdato_net button in SharePanel
- Mascot 'дядя Миша' — stickers, buttons in SharePanel

### Fixed
- Badge: uniform dark background and enhanced glow
- Badge label: 15px header font + T0 best practices
- Cut tail issues — duplicate jokes, author collisions, stamped format

### Spec
- Viral badge — proposal, design iterations, review fixes

## [2026-08-26]

### Added
- Mascot 'дядя Вова' + custom 404 page
- Real HTTP 404, noindex, compressed image, nav fixes

### Media
- Evening 2026-08-25 cover post

## [2026-08-25]

### Spec
- Viral badge: horizontal and vertical design variants
- Viral badge: 'за хуёво' variant and download description

## [2026-08-21]

### Fixed
- Backend Cargo.toml edition 2024→2021 (2024 didn't compile)
- Reverted edition to 2024 — works on Rust 1.95, was a cache issue

## [2026-08-14]

### Added
- 'Подписаться на @pizdato_net' button to SharePanel
- 104 new quotes (total 321)
- Mascot 'дядя Миша' — stickers, buttons in SharePanel

### Fixed
- Stamped quotes rewritten into varied formats
- Max-width 100% for narrow screens, hover lift 1px
- Cut tail issues — duplicate jokes, author collisions, stamped format

## [2026-08-13]

### Added
- Mascot 'дядя Вова' + custom 404 page
- Design spec for mascot and 404 page

### Fixed
- 404 page centering and duplicate buttons
- Real HTTP 404, noindex, compressed image, nav fixes

### Spec
- Mascot character 'дядя Вова' + custom 404 page (review fixes)

## [2026-08-08]

### Added
- Articles/essay rewritten in living style with new images, confetti, living background, animated counter
- SEO page shells hidden until React mounts
- Yandex crawl of product pages and favicon.ico fixed
- Magnets tightened with dual CTA, OpenSpec content work archived

## [2026-08-07]

### Added
- Deferred-life article with heroes and Yandex growth plan
- Yandex.Metrica with vote and Telegram goals
- Official Yandex.Metrika head snippet on all pages
- Article SEO shells synced from articles registry
- Yandex content-magnet delta specs synced into main OpenSpec
- OpenSpec Cursor skills and opsx command stubs

### Fixed
- News dedupe poisoned by KP.RU nav chrome

## [2026-08-06]

### Added
- Initial voting site with cookie-only voter identity
- Post-vote wisdom quotes with share card and badge
- Soft IP rate limits, session age requirements
- Public read-only MCP stats over Streamable HTTP
- Illustrated research essay page at /issledovanie
- Professional FAQ page with crawlable shell
- Votes feed, how-it-works page, and site-wide navigation
- Hourly news votes with morning/evening channel posts
- Yandex + Google technical SEO
- Channel posters, daily owner traffic DM

### Fixed
- Document scrolling on essay and FAQ pages
- News dedupe by article body without false matches
- Stats loading against brief SQLite contention
- Site nav fixed on home page