## Purpose

Instrument Yandex.Metrica so organic traffic, article engagement, votes, and Telegram outbound clicks can be measured and improved under a Yandex-first growth strategy.

## ADDED Requirements

### Requirement: Metrica loads on public site pages
Public HTML entry pages of the site MUST load Yandex.Metrica with a configured counter ID, without blocking primary content rendering.

#### Scenario: Visitor opens home or article
- **WHEN** a visitor loads a public page with scripts enabled
- **THEN** the Metrica counter initializes for that pageview

### Requirement: Vote conversion goal
The analytics setup MUST define a goal that fires when a visitor successfully completes a vote on the home page.

#### Scenario: Successful vote
- **WHEN** a visitor’s vote is accepted by the site
- **THEN** a Metrica goal for vote success is recorded

### Requirement: Telegram outbound goal
The analytics setup MUST define a goal that fires when a visitor follows a primary link to `t.me/pizdato_net` (or the canonical channel URL used on the site).

#### Scenario: Click to channel
- **WHEN** a visitor clicks a primary Telegram channel link on the site
- **THEN** a Metrica goal for Telegram outbound is recorded

### Requirement: Privacy and robots coexistence
Metrica MUST NOT be required for core vote functionality, and `/api/` MUST remain disallowed in `robots.txt` as today; analytics MUST NOT expose private API payloads to crawlers via indexed HTML.

#### Scenario: Crawler hits API path
- **WHEN** a crawler respects `robots.txt`
- **THEN** it does not crawl `/api/` paths for indexing
