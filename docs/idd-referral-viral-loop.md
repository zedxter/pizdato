# Acceptance Brief: Referral / Viral Loop

**Status:** Draft
**Revision:** 1
**Prepared for:** Implementation (spec-PR → Cursor)

## Goal

Visitors who vote get a shareable referral link; when N friends vote via that link, the referrer earns one extra vote. The channel grows through share-to-subscribe CTAs and visible referral counter.

## Scope

**In scope**
- Share-to-subscribe CTA: post-vote panel shows a Telegram deep-link that pre-fills a share message with the site URL + subscribe prompt
- Referral tracking: each voter gets a unique referral code/link; backend records referred votes
- Vote-again mechanic: voter earns 1 extra vote when 3 unique referred visitors cast their first vote (rate-limited: max 2 extra votes per 24h per referrer)
- Referral counter: site shows "N people came through your link" in the share panel
- Tracking: referral conversions logged to `/api/event`
- Backend: new DB tables (`referrals`, `referral_redemptions`) + new endpoint `/api/referral/stats`

**Out of scope**
- No gamification levels or leaderboards
- No email/SMS referral invites (Telegram & direct share only)
- No invite-only or waitlist mechanics
- No complex referral tiers or rewards beyond the one-extra-vote mechanic
- No UI for browsing other people's referral stats

## Context

**Discovered facts** (technical, verified from repository)
- Current vote flow: one vote per visitor (cookie-based voter_id + IP hash anti-abuse)
- SharePanel.tsx already has Telegram share button (`t.me/share/url`), VK share, copy, badge download, and native share
- Post-vote panel shows "Кинь другу результат — пусть тоже выберет" with result text
- Backend has `/api/event` endpoint (rate-limited, allowlisted event types) for tracking
- Backend already has IP-level rate limiting and blacklisting
- Badge improvements (vertical format, watermark, stories button) exist in parallel `viral-badge` change
- Site URL: `https://pizdato.net/`

**Product/business constraints**
- Channel growth is critical bottleneck (5 subscribers, ~4 views/post per Issue #66)
- Must be simple: no login, no captcha — the referral must not break the frictionless vote flow
- The one-vote constraint is intentional for data quality; the extra-vote reward must not bypass anti-abuse

**Assumptions**
- Referral link is just `https://pizdato.net/?ref=<code>` — no separate landing page needed
- Ref code = first 8 chars of SHA256(voter_id + salt), displayed as short readable code
- Extra vote: 3 referred voters → 1 extra vote slot; max 2 extra votes/24h per referrer
- "Voted via referral" = visitor opened ref link and cast their first vote (cookie check)
- No GDPR consent for referral tracking (same cookie-based session as vote, no PII stored)

**Dependencies and constraints**
- Depends on the vote session infrastructure (cookie, voter_id)
- Must not weaken existing anti-abuse (IP rate limits, blacklisting)
- DB migrations needed: new tables `referrals` and `referral_redemptions`
- Frontend: modifications to SharePanel.tsx and possibly a new referral-tracking hook

## Risk Review

| Risk area | Applies? | Required handling |
| --- | --- | --- |
| Security/privacy | Yes | Referral codes must not leak voter identity; no PII in referral data |
| Persistent data/migration | Yes | New SQLite tables; backward-compatible (referral field is NULL until the feature ships) |
| External effects/cost | No | All in-house, no paid API |
| Compatibility/API | Yes | New endpoints only; existing `/api/vote`, `/api/stats` unchanged |
| UX/accessibility | Yes | Referral CTA must be clear for non-technical users; deep-links must work on mobile Telegram |

## Acceptance Criteria

### AC-001: Post-vote panel shows share-to-subscribe Telegram link
- **Scenario:** visitor just voted, SharePanel is visible
- **Action:** click Telegram share icon
- **Expected:** opens `t.me/share/url` with a pre-filled message containing the site URL, vote result, and "Подпишись на @pizdato_net" prompt
- **Must not:** remove existing Telegram share functionality
- **Verification:** manual click-through, the pre-filled message includes both result and subscribe CTA
- **Priority:** Required

### AC-002: Referral link is generated per voter
- **Scenario:** voter opens SharePanel after voting
- **Action:** view the referral section
- **Expected:** a short readable referral code/link is displayed (e.g., `pizdato.net/?ref=abc123`)
- **Must not:** reveal voter_id, IP, or any personally identifying information
- **Verification:** inspect the displayed code; confirm it's deterministic for the same voter_id
- **Priority:** Required

### AC-003: Referred vote is tracked
- **Scenario:** new visitor opens `pizdato.net/?ref=abc123` and votes
- **Action:** they cast their first vote
- **Expected:** the vote is attributed to the referrer's code; `referral_redemptions` table records the event
- **Must not:** allow self-referral (same voter_id / session cannot refer itself)
- **Verification:** integration test with mock voter_ids; check DB rows
- **Priority:** Required

### AC-004: Referrer earns extra vote slot
- **Scenario:** referrer has accumulated 3 unique referred first-time voters
- **Action:** referrer visits the site
- **Expected:** backend returns an `extra_vote_available: true` flag; referrer can cast a second vote on the same page
- **Must not:** exceed 2 extra votes per 24h per referrer; must not bypass IP rate limits for the second vote
- **Verification:** integration test; check rate-limit counters
- **Priority:** Required

### AC-005: Referral counter visible in SharePanel
- **Scenario:** voter opens SharePanel after voting
- **Action:** view the referral section
- **Expected:** displays "По вашей ссылке проголосовало: N" (or 0 if none)
- **Must not:** show the actual voter_ids or timestamps of referred users
- **Verification:** manual inspection + backend returns correct count
- **Priority:** Important

### AC-006: Anti-abuse preserved
- **Scenario:** a voter tries to game the system (self-referral, repeated clicks, bot traffic)
- **Action:** send multiple requests, refer own session
- **Expected:** self-referral is silently ignored; IP rate limits still apply; extra vote slots are subject to existing daily IP limits
- **Must not:** create new bypass vectors for vote manipulation
- **Verification:** test self-referral returns no attribution; existing rate-limit tests still pass
- **Priority:** Required

## Blocking Decisions

- [x] Referral code encoding: first 8 hex chars of SHA256(voter_id + salt) — no separate DB for code generation
- [x] Extra vote mechanic: re-vote allowed via existing vote endpoint with `?ref=<code>` context; backend checks `referral_redemptions` count before allowing

## Verification Plan

| Criterion | Verification evidence | Status |
| --- | --- | --- |
| AC-001 | Manual click-through + shared message inspection | Pending |
| AC-002 | Integration: code generation deterministic for same voter_id | Pending |
| AC-003 | Integration: attributed vote in DB | Pending |
| AC-004 | Integration: extra_vote_available flag + second vote | Pending |
| AC-005 | Manual UI check + backend API returns count | Pending |
| AC-006 | Integration: self-referral ignored; rate limits intact | Pending |