## MODIFIED Requirements

### Requirement: Article social and structured metadata match the page
Each article page MUST expose Open Graph / Twitter image metadata pointing at that article’s hero image when one exists, and structured data MUST describe the article (headline, description, dates, and body or equivalent content signal). When article body or positioning is materially updated, the page’s meta description and structured-data description MUST be updated in the same publish so they do not describe a previous version of the piece.

#### Scenario: Share card uses article image
- **WHEN** a page is shared via a client that reads `og:image`
- **THEN** the preview image is the article hero asset, not a generic site fallback (unless no hero exists)

#### Scenario: Content rewrite republished
- **WHEN** editors materially rewrite an article and deploy
- **THEN** crawlers and share previews see a description that matches the revised body, not a stale blurb from before the rewrite
