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

**Rationale:** Zero storage overhead. The ip_salt prevents guessing another voter's code from their voter_id pattern. The code is short enough to share (8 hex chars). At the current scale (~5K voters) the birthday-problem collision probability is ~0.3%, acceptable with a resolution strategy (see Decision 1a). At 100K voters the collision probability would be ~69%, so a collision resolution mechanism is required before reaching that scale.

**Alternatives considered:**
- Random UUID stored in DB — simpler lookup but needs migration + index. Rejected because it adds complexity for no gain; the deterministic approach needs no storage.

### 1a. Collision resolution

**Decision:** When two voter_ids produce the same 8-char prefix (collision detected at lookup time), the backend SHALL extend the code by appending hex characters from the remaining SHA256 digest, one at a time, until the code is unique. The full SHA256 hex output is 64 characters; the average extra characters needed given the collision rates above is <1. The extended code is cached per session so the extra computation occurs only once per unique collision.

**Rationale:** Deterministic codes remain desirable for zero storage overhead. Extending only on actual collisions keeps codes short for the vast majority of voters while guaranteeing uniqueness for every voter. The extended code (9-12 chars) is still far shorter than a UUID (36 chars) or a full hash (64 chars). The approach scales to arbitrary voter counts with no storage requirement.

**Implementation note:** The collision check runs on first `/api/referral/stats` call for a voter, not at code generation time. The database is queried for existing codes, and the code is extended until unique. The result is cached in the response (or in a lightweight in-memory map) to avoid re-computation on subsequent requests.

### 2. Referral data model

**Decision:** Two new SQLite tables:

```sql
-- Maps voter_id → accumulated referred voters
CREATE TABLE referral_redemptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_voter_id TEXT NOT NULL,        -- the voter who referred
    referred_voter_id TEXT NOT NULL UNIQUE, -- the new voter (unique: one vote = one conversion)
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_redemptions_referrer ON referral_redemptions(referrer_voter_id);

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

**Decision:** At vote time, the backend runs the following check:

1. Count distinct `referred_voter_id` rows in `referral_redemptions` WHERE `referrer_voter_id = ?` → `total_referrals`
2. Count extra_votes rows WHERE `voter_id = ?` AND `consumed_at IS NULL` → `available_slots`
3. Count extra_votes rows WHERE `voter_id = ?` AND `consumed_at` is within the last 24 hours → `used_recently`
4. If `total_referrals >= 3 + available_slots` AND `used_recently < 2`, then allow the extra vote

Each 3 unique referrals earns exactly 1 extra vote slot (max 2 consumed per 24h). The extra vote uses the same `/api/vote` endpoint — the backend allows the re-vote for that voter_id and sets `consumed_at = datetime('now')` on the oldest unconsumed slot.

**Rationale:** Reuses existing vote infrastructure (rate limiting, IP checks). The 3:1 ratio keeps the loop simple — for every 3 friends who vote, you get 1 extra vote of your own.

### 4. Frontend referral session

**Decision:** The `?ref=` parameter is stored in `sessionStorage` when the visitor first lands. On vote submission, the frontend appends `?ref=<code>` to the `POST /api/vote` request. After the first vote, the ref is cleared from session storage to prevent re-attribution.

**Rationale:** sessionStorage persists across page navigations within the same tab but is discarded when the tab closes. Clearer than cookie-based ref tracking and avoids GDPR concerns (no persistent storage).

### 5. Referral code display in SharePanel

**Decision:** A new subsection in SharePanel shows the referral code as a copyable link.

**Code format for readability:** Instead of raw hex (`abc12345`), the referral code SHALL be a human-readable word pair generated by mapping the first 6 hex chars through a short wordlist (e.g., `Amber-Falcon`). The wordlist of ~256 adjectives and ~256 nouns produces 65K combinations, sufficient as a surface label; the underlying 8-char hex code remains in the URL. This makes the code readable, memorable, and easy to dictate.

**Display layout:**
- **Referral code card:** A distinct section with the referral link displayed as a clickable/copyable text (e.g., "pizdato.net/?ref=Amber-Falcon") with a prominent copy button and a tooltip "Скопировано!" on success.
- **Referral counter:** Below the code: "По твоей ссылке проголосовало: N". Shows a visual progress indicator — a segmented bar (3 segments, filled per referred voter) with labels "0/3 → 1 голос". When N ≥ 3, bar shows full and text reads "🎉 Ты заработал дополнительный голос!".
- **Extra vote badge:** When `extra_vote_available: true`, the counter section transforms into a celebration card with a larger "🎉 Ты заработал дополнительный голос!" heading, brief explanation ("Приведи 3 друзей — получи 1 голос"), and a prominent "Проголосовать ещё" button.
- **Progress indicator for reward ceiling:** Below the counter, a secondary progress note: "Максимум 2 дополнительных голоса в сутки. Использовано: X/2" when the voter has earned at least one extra vote.

**Rationale:** Word pairs make codes human-readable; the segmented bar creates a clear goal gradient ("3 more referrals = 1 more vote") without gamification. The celebration card transforms a utilitarian counter into a rewarding moment.

### 6. Enhanced Telegram share

**Decision:** Modify the existing Telegram share text in `share.ts` to include the site URL + "Подпишись на @pizdato_net — каждый день пиздато/хуёво" when the voter has a referral code. The share URL stays `t.me/share/url` with `url` and `text` params.

## Risks / Trade-offs

- **[Risk] Referral code collisions at scale:** With 8 hex chars = ~4.3 billion possible codes, birthday-problem collision probability at 100K voters is ~69% (not 0.1% as initially estimated). At current scale (~5K voters) it's ~0.3% — acceptable. The collision resolution strategy in Decision 1a mitigates this by extending codes on collision.
- **[Risk] Extra vote abuse via multiple browsers/IPs:** The existing IP-level rate limiting and daily limits still apply. The extra vote is not a bypass — it's a one-time slot that still respects all vote guards.
- **[Risk] User confusion about extra vote:** The SharePanel celebration card explains the mechanic ("Приведи 3 друзей — получи 1 голос") and shows a prominent "Проголосовать ещё" button. The progress bar gives continuous feedback toward the next reward threshold.
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