## Context

See proposal.md and specs for motivation and requirements. The existing codebase has:

- **Backend**: Axum handlers in `handlers.rs`, SQLite via `sqlx` in `db.rs`. No `/api/recent-activity` endpoint exists yet. Events are already logged via `/api/event` (badge_download, share_result_*) but are not queryable — they're fire-and-forget trace logs, not persisted events.
- **Frontend**: React + Vite TypeScript. Hash-based routing via App.tsx (conditionally renders Feed, Articles, Essay, Faq, etc. based on URL hash). No formal router library. The `badge.ts` module handles badge generation/download.
- **DB**: SQLite with WAL mode. `votes` table has vote data with timestamps. No events table — events are only logged via `tracing::info!` in `handle_event()`.

The key architectural decision: the current event system is fire-and-forget (log-only). To support a badge gallery, we need to either:
(a) persist events to a new DB table, or
(b) derive badge gallery data from existing `votes` data + static badge types.
We'll use option (a) — add an `events` table — because it captures share destinations and badge types that votes alone cannot.

## Goals / Non-Goals

**Goals:**
- New `events` SQLite table to persist badge and share events (type, verdict, created_at, no voter identity)
- New `/api/recent-activity` endpoint returning mix of recent votes + badge events
- `VoteTicker` React component on home and feed pages (animated marquee of recent votes)
- `Badges` page component at `/badges` route showing badge gallery
- `SiteNav` updated with badge gallery link
- Site content in Russian (user-facing)

**Non-Goals:**
- User profiles or voter identity
- Comment system or discussion threads
- Emoji reactions or agree/disagree on feed items (deferred to future issues)
- Real-time WebSocket push — uses polling instead
- Moderation system for badge gallery (anonymized content doesn't need it)

## Decisions

1. **New `events` table over extracting from votes**: Votes have voter_id we must not expose. Events are inherently anonymized. A separate events table cleanly separates share/badge data from vote data and avoids accidental identity leaks.

2. **`/api/recent-activity` over extending `/api/stats`**: The stats endpoint is already voter-specific. A new endpoint is cleaner — returns public, anonymized data suitable for caching/CDN.

3. **Polling over WebSocket**: The site has no WebSocket infrastructure. A 30-second polling interval is simple to implement, sufficient for a badge gallery, and consistent with the existing REST-only architecture.

## Risks / Trade-offs

- **[Events table growth]** → Mitigation: Add a retention window (keep 7 days of events; older rows pruned on migration or periodic cleanup).
- **[Vote ticker stale data]** → Acceptable: 30s polling is fast enough to show "recent" activity without UX issues. Could degrade to 5s for the ticker specifically.
- **[No voter identity in gallery]** → By design: Gallery shows anonymous entries to avoid privacy concerns. This is intentional per spec.

## Open Questions

- Should the recent-activity endpoint return vote events that are already in the votes table, or only new events from the new events table? Decision: return both — combine recent votes (from votes table, anonymized) with badge events (from events table). This keeps the ticker rich with content.