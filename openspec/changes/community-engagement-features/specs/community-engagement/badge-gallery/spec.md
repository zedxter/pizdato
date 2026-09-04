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

#### Scenario: Gallery loading state
- **WHEN** the badge gallery is fetching events on initial load
- **THEN** the page shows a loading spinner
- **AND** pending cards are fixed-height skeleton placeholders

#### Scenario: Gallery load-more loading state
- **WHEN** the visitor triggers a "load more" action
- **THEN** a loading spinner is shown for that action

#### Scenario: Gallery fetch error
- **WHEN** the events fetch fails
- **THEN** the page shows "Не удалось загрузить события"
- **AND** a retry button is displayed
- **AND** activating the retry button re-fetches events

### Requirement: Badge gallery reads from recent-activity API
The badge gallery SHALL fetch persisted badge events from `/api/recent-activity`. The endpoint SHALL accept a `?type=badges` parameter to return only badge events. Events are written by `/api/event` into the `events` table. The existing event log is fire-and-forget (`tracing::info!` only) and is not queryable. Event types include `badge_download`, `badge_share_stories`, `share_result_telegram`, `share_result_vk`, `share_result_copy`, `share_result_native`.

#### Scenario: Gallery fetches badge events
- **WHEN** the badge gallery GETs `/api/recent-activity?type=badges&limit=20`
- **THEN** the response contains badge events only, each with `type: "badge"`, `event_type: "badge_download"|"badge_share_stories"|...`, and `created_at`
- **AND** no voter identity is exposed

#### Scenario: Gallery fetches all activity
- **WHEN** the badge gallery GETs `/api/recent-activity?type=all&limit=20`
- **THEN** the response includes both badge events and vote events, ordered by `created_at` descending
- **AND** badge events have `type: "badge"` while vote events have `type: "vote"`

### Requirement: Gallery navigation
The site navigation SHALL include a link to the badge gallery.

#### Scenario: Site nav shows badges link
- **WHEN** a visitor views any page with `SiteNav`
- **THEN** the navigation includes a "Значки" (Badges) link
- **AND** the link is a plain anchor tag for SEO
