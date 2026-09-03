## Purpose

Shows recent vote activity as an animated marquee on public pages, creating social proof that the community is actively participating.

## ADDED Requirements

### Requirement: Recent votes API endpoint
The system SHALL expose a public `/api/recent-activity` endpoint returning the N most recent votes with anonymized data (no voter identity).

#### Scenario: Fetch recent activity
- **WHEN** a client GETs `/api/recent-activity?limit=20`
- **THEN** the response contains an array of recent vote entries, each with `type: "vote"`, `choice: "pizdato"|"huyevo"`, and `created_at` timestamp
- **AND** no voter identity (cookie, IP, hash, or any identifier) is included in the response

#### Scenario: Empty recent activity
- **WHEN** no votes have been cast
- **THEN** the response contains an empty items array

### Requirement: Vote ticker on home page
The home page SHALL display a live vote ticker showing the most recent votes as an animated marquee.

#### Scenario: Visitor sees recent votes on home
- **WHEN** a visitor loads the home page and recent votes exist
- **THEN** the ticker displays vote entries scrolling horizontally
- **AND** each entry shows "Someone just voted: пиздато" or "Someone just voted: хуёво" with the time ago
- **AND** entries animate in a continuous loop
- **AND** the ticker does not autoplay when `prefers-reduced-motion` is set

#### Scenario: No recent votes
- **WHEN** no recent votes exist (empty response)
- **THEN** the ticker is hidden entirely after the fetch completes

### Requirement: Vote ticker on feed page
The news feed page SHALL display the same vote ticker component below the page header.

#### Scenario: Feed shows recent votes
- **WHEN** a visitor opens the feed page and recent votes exist
- **THEN** the ticker appears between the header and the first feed card
- **AND** it behaves identically to the home page ticker

#### Scenario: Ticker on feed with no recent activity
- **WHEN** no recent votes exist
- **THEN** the ticker is hidden after the fetch completes

### Requirement: Marquee pause-on-hover
The VoteTicker marquee animation SHALL pause when the user hovers over it (`animation-play-state: paused` on `:hover`). This satisfies WCAG 2.1 Success Criterion 2.2.2 (Pause, Stop, Hide).

#### Scenario: Hover pauses ticker animation
- **WHEN** a visitor hovers the pointer over the vote ticker
- **THEN** the marquee animation pauses
- **AND** the animation resumes when the pointer leaves the ticker

### Requirement: Vote ticker layout stability
The vote ticker container SHALL have a fixed minimum height (e.g., 36px) to prevent layout shift when data loads or when transitioning between empty and populated states.

#### Scenario: Ticker container has fixed minimum height
- **WHEN** the ticker is shown (loading or populated)
- **THEN** the container has a fixed minimum height of at least 36px
- **AND** loading or populating the ticker does not shift surrounding page content

### Requirement: Vote ticker loading and error states
The VoteTicker SHALL show a subtle shimmer/skeleton placeholder while fetching (no empty space). On fetch error, the ticker SHALL retry silently (up to 3 times with 2s interval) before hiding.

#### Scenario: Ticker loading state
- **WHEN** the ticker is fetching recent activity for the first time
- **THEN** a shimmer/skeleton placeholder is shown inside the fixed-height container
- **AND** no empty gap is left on the page

#### Scenario: Ticker fetch error with retry
- **WHEN** the recent-activity fetch fails
- **THEN** the ticker retries silently up to 3 times with a 2-second interval
- **AND** if all retries fail, the ticker is hidden
