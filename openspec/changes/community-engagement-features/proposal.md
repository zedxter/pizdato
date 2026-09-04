## Why

The site currently has zero community engagement mechanics — no social proof beyond aggregate percentages, no way for visitors to see that others are actively voting, and no gallery of badges that create social proof for new visitors. This limits conversion (new visitors have no signal that the community is active) and viral spread (badges are shared but never showcased).

Adding a live vote ticker and a badge gallery turns the site into a witnessed, shared experience rather than a solitary one.

## What Changes

- **Live vote ticker**: A small animated marquee shown on the home page and feed page that displays recent vote activity ("Someone just voted: пиздато"). Fetches anonymized recent votes from the new `/api/recent-activity` endpoint. Does NOT expose voter identity — all entries are anonymized.
- **Badge gallery**: A new public page (`/badges`) that shows recent badge downloads and shares (anonymized). The existing `/api/event` handler is fire-and-forget (`tracing::info!` only) and is not queryable. Supporting the gallery requires a new `events` SQLite table, a new `/api/recent-activity` endpoint, and 7-day retention on the `events` table. Writes still go through `/api/event`; reads go through `/api/recent-activity`.
- **New API endpoint for recent activity**: A new `/api/recent-activity` endpoint that returns recent vote timestamps (anonymized from the `votes` table) and badge events (from the new `events` table), so the frontend can display the ticker and gallery.

## Capabilities

### New Capabilities
- `community-engagement/live-vote-ticker`: Displays recent vote activity as an animated marquee on home and feed pages. Fetches recent votes from `/api/recent-activity`. Anonymized, no voter identity exposed.
- `community-engagement/badge-gallery`: A public page (`/badges`) showing recent badge downloads and shares. Fetches recent badge events from `/api/recent-activity` (backed by the new `events` table). Anonymized entries with timestamps.

### Modified Capabilities
- *(none — existing specs remain unchanged)*

## Impact

- **Backend**: New `events` SQLite table (`events`: `id`, `type`, `verdict`, `created_at`). New `/api/recent-activity` endpoint combining recent votes (anonymized from the `votes` table) + badge events (from the new `events` table). 7-day retention cleanup on the `events` table. The existing `/api/event` write path must persist rows to `events`; the current event log is fire-and-forget and is not queryable.
- **Frontend**: New `Badges.tsx` page component. New `VoteTicker.tsx` component added to `App.tsx` and `Feed.tsx`. New API call in `api.ts`.
- **Routing**: New `/badges` route in the frontend router (currently handled by `App.tsx`'s hash-based routing or nav logic).
- **CSS**: New styles for the ticker and badge gallery.

### Retention

Events are retained for 7 days. Cleanup runs via a scheduled query on app startup and/or as part of the schema migration: `DELETE FROM events WHERE created_at < datetime('now', '-7 days')`. This keeps the `events` table from unbounded growth.
