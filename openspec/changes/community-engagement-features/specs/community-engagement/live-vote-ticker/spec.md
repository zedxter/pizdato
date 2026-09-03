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
- **THEN** the ticker is hidden entirely

### Requirement: Vote ticker on feed page
The news feed page SHALL display the same vote ticker component below the page header.

#### Scenario: Feed shows recent votes
- **WHEN** a visitor opens the feed page and recent votes exist
- **THEN** the ticker appears between the header and the first feed card
- **AND** it behaves identically to the home page ticker

#### Scenario: Ticker on feed with no recent activity
- **WHEN** no recent votes exist
- **THEN** the ticker is hidden, no empty space is reserved