## Context

See proposal.md for motivation. Current state: one vote per visitor enforced via cookie session + IP hash anti-abuse. SharePanel already has Telegram/VK share, copy, badge download, and native share. No referral tracking or vote-reward mechanic exists.

## Goals / Non-Goals

**Goals:**
- Deterministic referral code per voter (no DB table for code → voter_id mapping)
- Backend tracks referral redemptions in SQLite with minimal new tables
- Frontend displays referral code + counter in SharePanel
- Extra vote slot gated by 3 referrals, max 2 per 24h
- Enhanced Telegram share CTA with subscribe prompt

**Non-Goals:**
- No gamification, leaderboards, or tiers
- No email/SMS referral invites
- No invite-only mechanics
- No referral analytics dashboard
- No separate referral landing page

## Decisions

### 1. Referral code generation

**Decision:** `substr(SHA256(voter_id || ip_salt), 0, 8)` computed on the fly. No dedicated `ref_codes` table — the code is deterministic from existing data.

**Rationale:** Zero storage overhead. The ip_salt prevents guessing another voter's code from their voter_id pattern. The code is short enough to share (8 hex chars), long enough to avoid collisions in a site with <100K voters (collision probability negligible).

**Alternatives considered:**
- Random UUID stored in DB — simpler lookup but needs migration + index. Rejected because it adds complexity for no gain; the deterministic approach needs no storage.

### 2. Referral data model

**Decision:** Two new SQLite tables:

```sql
-- Maps voter_id → accumulated referred voters
CREATE TABLE referral_redemptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_voter_id TEXT NOT NULL,        -- the voter who referred
    referred_voter_id TEXT NOT NULL UNIQUE,  -- the new voter (unique: one vote = one conversion)
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tracks extra vote slots earned and consumed
CREATE TABLE extra_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    voter_id TEXT NOT NULL,
    earned_at TEXT NOT NULL DEFAULT (datetime('now')),
    consumed_at TEXT,   -- NULL until used
    UNIQUE(voter_id, earned_at)
);
CREATE INDEX idx_extra_votes_voter ON extra_votes(voter_id);
```

**Rationale:** `referral_redemptions` tracks each unique referred voter. The UNIQUE constraint on `referred_voter_id` prevents double-counting. `extra_votes` logs each earned slot (3 redemptions → 1 row) with consumption tracking.

### 3. Extra vote slot mechanics

**Decision:** Backend checks at vote time: if the voter has >= 3 more redemptions than earned extra_vote rows, AND less than 2 extra votes consumed in the last 24h, allow the second vote. The extra vote uses the same `/api/vote` endpoint — the backend allows the re-vote for that voter_id.

**Rationale:** Reuses existing vote infrastructure (rate limiting, IP checks). The voter gets ONE extra vote per 3 referrals, not per-N-referrals-unlimited.

### 4. Frontend referral session

**Decision:** The `?ref=` parameter is stored in `sessionStorage` when the visitor first lands. On vote submission, the frontend appends `?ref=<code>` to the `POST /api/vote` request. After the first vote, the ref is cleared from session storage to prevent re-attribution.

**Rationale:** sessionStorage persists across page navigations within the same tab but is discarded when the tab closes. Clearer than cookie-based ref tracking and avoids GDPR concerns (no persistent storage).

### 5. Referral code display in SharePanel

**Decision:** A new subsection in SharePanel shows the referral code as a copyable text (e.g., "Твоя ссылка: pizdato.net/?ref=abc12345") with a copy button. Below it, the counter: "По твоей ссылке проголосовало: N". When extra vote is available, show a badge "🎉 Ты заработал дополнительный голос!".

### 6. Enhanced Telegram share

**Decision:** Modify the existing Telegram share text in `share.ts` to include the site URL + "Подпишись на @pizdato_net — каждый день пиздато/хуёво" when the voter has a referral code. The share URL stays `t.me/share/url` with `url` and `text` params.

## Risks / Trade-offs

- **[Risk] Referral code collisions at scale:** With 8 hex chars = 4 billion possible codes, collision probability at <100K voters is ~0.1%. Acceptable for current scale.
- **[Risk] Extra vote abuse via multiple browsers/IPs:** The existing IP-level rate limiting and daily limits still apply. The extra vote is not a bypass — it's a one-time slot that still respects all vote guards.
- **[Risk] User confusion about extra vote:** The SharePanel shows a clear message when an extra vote is available. The user clicks the "vote again" button which re-triggers the vote UI.
- **[Trade-off] SQLite writes for every referral:** At current scale (<100 votes/day), this is negligible. At 10K votes/day, still fine for SQLite WAL mode.

## Migration Plan

1. Deploy backend with new DB tables (SQLite migration runs on startup)
2. Deploy frontend with SharePanel updates and referral session logic
3. No rollback complexity — removing tables is safe if no data exists
4. Rollback: revert frontend + backend, drop extra_votes/redemptions tables (data loss acceptable at early stage)

## Rollback Path

1. Revert frontend code
2. Revert backend code  
3. Drop `referral_redemptions` and `extra_votes` tables if needed
4. Remove new event types from allowlist
5. Redeploy