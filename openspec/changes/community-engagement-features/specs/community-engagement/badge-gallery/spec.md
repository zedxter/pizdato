## Purpose

Provides a public gallery page showing recent badge downloads and shares, creating social proof for new visitors and encouraging badge sharing.

## ADDED Requirements

### Requirement: Badge gallery page
The system SHALL expose a public page at `/badges` showing recent badge-related events (downloads, shares) as anonymized entries.

#### Scenario: Visitor opens badge gallery
- **WHEN** a visitor navigates to `/badges`
- **THEN** the page displays a chronological list of recent badge events
- **AND** each entry shows the event type icon (download vs share), the verdict ("пиздато" or "хуёво"), and a relative timestamp ("2 minutes ago")
- **AND** entries are paginated (20 per page, infinite scroll or "load more")

#### Scenario: Empty badge gallery
- **WHEN** no badge events exist
- **THEN** the page shows an empty state message indicating badges will appear when users share them

#### Scenario: Gallery auto-refreshes
- **WHEN** the page is open
- **THEN** it polls for new events every 30 seconds
- **AND** new entries appear at the top without disrupting scroll position

### Requirement: Badge gallery uses existing event API
The badge gallery SHALL use the existing `/api/event` endpoint's data (badge_download, badge_share_stories, share_result_telegram, share_result_vk, share_result_copy, share_result_native), extended with a read-back capability.

#### Scenario: Recent activity API returns badge events
- **WHEN** the `/api/recent-activity` endpoint receives a request
- **THEN** the response includes badge events alongside vote events
- **AND** badge events have `type: "badge"`, `event_type: "badge_download"|"badge_share_stories"|...`, and `created_at`
- **AND** no voter identity is exposed

### Requirement: Gallery navigation
The site navigation SHALL include a link to the badge gallery.

#### Scenario: Site nav shows badges link
- **WHEN** a visitor views any page with `SiteNav`
- **THEN** the navigation includes a "Значки" (Badges) link
- **AND** the link is a plain anchor tag for SEO