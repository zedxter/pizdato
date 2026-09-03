## Why

The site currently has zero community engagement mechanics — no social proof beyond aggregate percentages, no way for visitors to see that others are actively voting, and no gallery of badges that create social proof for new visitors. This limits conversion (new visitors have no signal that the community is active) and viral spread (badges are shared but never showcased).

Adding a live vote ticker and a badge gallery turns the site into a witnessed, shared experience rather than a solitary one.

## What Changes

- **Live vote ticker**: A small animated marquee shown on the home page and feed page that displays recent vote activity ("Someone just voted: пиздато"). Uses the existing event log system. Does NOT expose voter identity — all entries are anonymized.
- **Badge gallery**: A new public page (`/badges`) that shows recent badge downloads and shares (anonymized). Uses the existing event log (`/api/event`) which already records `badge_download`, `badge_share_stories`, `share_result_telegram`, etc. No new backend endpoint needed — events are already being logged.
- **New API endpoint for recent activity**: A lightweight `/api/recent-activity` endpoint (or a new query param on `/api/stats`) that returns recent vote timestamps and badge events, so the frontend can display the ticker and gallery without polling the event log directly.

## Capabilities

### New Capabilities
- `community-engagement/live-vote-ticker`: Displays recent vote activity as an animated marquee on home and feed pages. Fetches recent votes from a lightweight API endpoint. Anonymized, no voter identity exposed.
- `community-engagement/badge-gallery`: A public page (`/badges`) showing recent badge downloads and shares. Fetches recent events from the event log API. Anonymized entries with timestamps.

### Modified Capabilities
- *(none — existing specs remain unchanged)*

## Impact

- **Backend**: New `/api/recent-activity` endpoint returning recent votes and badge events. Uses existing `votes` and `event` tables. Minimal new code — reuse existing event logging infrastructure.
- **Frontend**: New `Badges.tsx` page component. New `VoteTicker.tsx` component added to `App.tsx` and `Feed.tsx`. New API call in `api.ts`.
- **Routing**: New `/badges` route in the frontend router (currently handled by `App.tsx`'s hash-based routing or nav logic).
- **CSS**: New styles for the ticker and badge gallery.