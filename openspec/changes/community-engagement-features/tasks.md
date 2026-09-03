## 1. Backend — Events table and recent-activity endpoint

- [ ] 1.1 Add `events` table to `db.rs` migration (type, verdict, created_at; no voter identity; 7-day retention window)
- [ ] 1.2 Update `handlers.rs` `handle_event()` to persist events to DB instead of logging only
- [ ] 1.3 Add `list_recent_activity()` query to `db.rs` — returns recent votes (from votes table, anonymized) + badge events (from events table), respecting the vote ticker limit
- [ ] 1.4 Add `/api/recent-activity` handler with `?type=votes|badges|all` and `?limit=N` query params
- [ ] 1.5 Register the new route in `main.rs`
- [ ] 1.6 Run 7-day retention cleanup on app startup (`DELETE FROM events WHERE created_at < datetime('now', '-7 days')`); optionally also prune probabilistically (1-in-100) inside `handle_event()` on write

## 2. Frontend — Vote ticker component

- [ ] 2.1 Create `RecentVoteTicker.tsx` — animated marquee component that fetches `/api/recent-activity?type=votes&limit=10` and scrolls entries
- [ ] 2.2 Add `fetchRecentActivity()` to `api.ts` with TypeScript types
- [ ] 2.3 Integrate `RecentVoteTicker` into `App.tsx` (home page, below brand lockup)
- [ ] 2.4 Integrate `RecentVoteTicker` into `Feed.tsx` (below page header)
- [ ] 2.5 Add CSS for the ticker (marquee animation, reduced-motion support, dark theme)
- [ ] 2.6 Pause-on-hover CSS: marquee uses `animation-play-state: paused` on `:hover` (WCAG 2.1 SC 2.2.2)
- [ ] 2.7 Layout shift: ticker container has a fixed minimum height (36px)
- [ ] 2.8 Loading and error states for VoteTicker: shimmer/skeleton while fetching; silent retry up to 3 times at 2s interval, then hide

## 3. Frontend — Badge gallery page

- [ ] 3.1 Create `Badges.tsx` — full page component showing recent badge events with pagination (polling every 30s, "load more" button)
- [ ] 3.2 Route `/badges` in `App.tsx` (hash-based routing)
- [ ] 3.3 Add `SiteNav` link to badge gallery (including `current="badges"` support)
- [ ] 3.4 Add CSS for badge gallery page (card layout, event icons, timestamps)
- [ ] 3.5 Loading and error states for Badge Gallery: fixed-height card skeleton + spinner on initial load and "load more"; on error show "Не удалось загрузить события" with a retry button

## 4. Polish and verification

- [ ] 4.1 Verify frontend builds without errors (`cd frontend && npm run build`)
- [ ] 4.2 Verify backend compiles (`cargo build`)
- [ ] 4.3 Run existing tests (`cargo test`)
- [ ] 4.4 Manual smoke test: vote on home page → verify ticker shows the vote → navigate to badges page → verify events appear
