## Why

pizdato.net has no referral or viral loop. Users vote once and leave — no reason to return or bring others. The Telegram channel has 5 subscribers (~4 views/post). Growth is entirely dependent on unique visitors with no organic amplification. We need a simple referral mechanic: share a link → friends vote via it → referrer gets one extra vote slot. This creates a self-reinforcing growth loop.

## What Changes

1. **Referral code per voter** — each voter gets a unique 12-hex-char referral code after voting (SHA256 prefix; base36 counter suffix on collision)
2. **Share panel enhancement** — Telegram share now includes a subscribe-to-channel CTA; referral section shows code, counter, N/3 progress toward reward, and a one-time celebration when the extra vote is first earned
3. **Referral tracking** — new backend tables `referral_redemptions` and `extra_votes` track referred votes and earned slots
4. **Vote-again reward** — referrer earns 1 extra vote when 3 unique referred visitors cast their first vote (atomic `extra_votes` insert on the 3rd/6th/9th/… redemption; max 2 extra votes/24h)
5. **Referral counter** — "По вашей ссылке проголосовало: N" shown in SharePanel with a progress bar while N < 3

## Capabilities

### New Capabilities

- `referral-tracking` — referral code generation, attribution of referred votes, redemption tracking with rate limits

### Modified Capabilities

- *(no existing spec changes — this is a new capability)*

## Impact

- **Frontend:** `SharePanel.tsx` — add referral code display, counter, N/3 progress indicator, celebration on first reward, enhanced Telegram share CTA
- **Frontend:** `share.ts` — add `buildReferralShareText()` and referral URL generation
- **Frontend:** new types in `api.ts` — `ReferralStats`
- **Backend:** `handlers.rs` — new `/api/referral/stats` endpoint, 12-hex referral code generation with collision suffix
- **Backend:** `db.rs` — new tables `referral_redemptions` and `extra_votes`; indexes on `referrer_voter_id` and `created_at`
- **Backend:** `models.rs` — new types for referral data
- **DB:** SQLite migration — add `referral_redemptions` and `extra_votes` tables plus indexes
- **API events:** add `share_referral`, `share_referral_telegram`, `referral_click`, `referral_conversion` event types