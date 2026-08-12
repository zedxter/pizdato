## Purpose

Make key site pages crawlable and content-complete for Yandex so topic articles and magnets can rank without depending only on client-side JavaScript.

## ADDED Requirements

### Requirement: Article pages expose full text to crawlers
Each published article permalink MUST include the full article body in the initial HTML response (not only after client JS execution), along with title, dek or description, and canonical URL.

#### Scenario: Crawler fetches article without executing JS
- **WHEN** a crawler requests an article URL and does not execute JavaScript
- **THEN** the response still contains the complete article prose sufficient to understand the topic

### Requirement: Article social and structured metadata match the page
Each article page MUST expose Open Graph / Twitter image metadata pointing at that article’s hero image when one exists, and structured data MUST describe the article (headline, description, dates, and body or equivalent content signal).

#### Scenario: Share card uses article image
- **WHEN** a page is shared via a client that reads `og:image`
- **THEN** the preview image is the article hero asset, not a generic site fallback (unless no hero exists)

### Requirement: Sitemap lists magnets with fresh lastmod
The public sitemap MUST list every published article URL and MUST update `lastmod` for an article when its content is materially updated or newly published.

#### Scenario: New magnet published
- **WHEN** a new article is published to production
- **THEN** its canonical URL appears in `sitemap.xml` with a `lastmod` reflecting the publish or update date

### Requirement: Yandex can be guided to render JS where needed
Until all critical pages reach static content parity, the operator MUST configure Yandex Webmaster JavaScript rendering so the bot prefers full page content, and MUST verify representative URLs with Webmaster page check.

#### Scenario: Thin shell detected
- **WHEN** Webmaster page check shows missing main content without JS on a critical URL
- **THEN** either static content is added for that URL or forced JS rendering remains enabled until parity is reached
