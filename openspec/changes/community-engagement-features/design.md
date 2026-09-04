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

### Events Table Schema

Table name: `events`

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Row identity |
| `type` | TEXT | NOT NULL | `'badge_download'`, `'badge_share_stories'`, etc. |
| `verdict` | TEXT | NOT NULL | `'pizdato'`, `'huyevo'` |
| `created_at` | TEXT | NOT NULL | ISO 8601 UTC timestamp |

No voter identity columns. The existing `/api/event` handler writes rows here; `/api/recent-activity` reads them. The fire-and-forget `tracing::info!` log is not a query surface.

### 7-Day Retention Execution Plan

On each app startup, run:

```sql
DELETE FROM events WHERE created_at < datetime('now', '-7 days');
```

Alternatively, run cleanup in `handle_event()` on every write (probabilistic, 1-in-100 chance) so writes also prune old rows without a dedicated scheduler.

### `/api/recent-activity` Merge Strategy

Returns N most recent items (votes + events) combined and time-ordered. A UNION query (`SELECT type='vote', choice as verdict, created_at FROM votes UNION ALL SELECT type='badge_download', verdict, created_at FROM events ORDER BY created_at DESC LIMIT ?`). Implementable form:

```sql
SELECT 'vote' AS type, choice AS verdict, created_at FROM votes
UNION ALL
SELECT type, verdict, created_at FROM events
ORDER BY created_at DESC
LIMIT ?
```

Votes contribute `type='vote'`; events contribute their stored type (e.g. `'badge_download'`). No cursor-based pagination for V1 — offset/limit is sufficient for the small data volume (max 50 items).

### Marquee Pause-on-Hover (WCAG)

The VoteTicker marquee animation SHALL pause when the user hovers over it (`animation-play-state: paused` on `:hover`). This satisfies WCAG 2.1 Success Criterion 2.2.2 (Pause, Stop, Hide).

### Layout Shift Mitigation

The vote ticker container SHALL have a fixed minimum height (e.g., 36px) to prevent layout shift when data loads or when transitioning between empty and populated states. The Badge Gallery page SHALL use a fixed-height card skeleton placeholder while loading.

### Loading and Error States

The VoteTicker SHALL show a subtle shimmer/skeleton placeholder while fetching (no empty space). On fetch error, the ticker SHALL retry silently (up to 3 times with 2s interval) before hiding. The Badge Gallery SHALL show a loading spinner on initial load and "load more" actions. On error, it SHALL show "Не удалось загрузить события" with a retry button.

## Risks / Trade-offs

- **[Events table growth]** → **Primary mitigation: 7-day retention.** On each app startup, run `DELETE FROM events WHERE created_at < datetime('now', '-7 days')`. Alternatively prune probabilistically (1-in-100) inside `handle_event()` on write. Without this cleanup the table grows unbounded as badge downloads and shares accumulate. Retention is a V1 requirement, not a later optimization.
- **[Vote ticker stale data]** → Acceptable: 30s polling is fast enough to show "recent" activity without UX issues. Could degrade to 5s for the ticker specifically.
- **[No voter identity in gallery]** → By design: Gallery shows anonymous entries to avoid privacy concerns. This is intentional per spec.

## Open Questions

- Should the recent-activity endpoint return vote events that are already in the votes table, or only new events from the new events table? Decision: return both — combine recent votes (from votes table, anonymized) with badge events (from events table). This keeps the ticker rich with content. Merge strategy: UNION of anonymized votes + events, time-ordered, offset/limit, max 50 items (see Merge Strategy above).
