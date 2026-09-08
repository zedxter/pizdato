## Why

pizdato.net has no referral or viral loop. Users vote once and leave — no reason to return or bring others. The Telegram channel has 5 subscribers (~4 views/post). Growth is entirely dependent on unique visitors with no organic amplification. We need a simple referral mechanic: share a link → friends vote via it → referrer gets one extra vote slot. This creates a self-reinforcing growth loop.

## What Changes

1. **Referral code per voter** — each voter gets a unique short referral code after voting
2. **Share panel enhancement** — Telegram share now includes a subscribe-to-channel CTA; referral section shows code + counter
3. **Referral tracking** — new backend tables `referrals` and `referral_redemptions` track referred votes
4. **Vote-again reward** — referrer earns 1 extra vote when 3 unique referred visitors cast their first vote (max 2 extra votes/24h)
5. **Referral counter** — "По вашей ссылке проголосовало: N" shown in SharePanel

## Capabilities

### New Capabilities

- `referral-tracking` — referral code generation, attribution of referred votes, redemption tracking with rate limits

### Modified Capabilities

- *(no existing spec changes — this is a new capability)*

## Impact

- **Frontend:** `SharePanel.tsx` — add referral code display, counter, enhanced Telegram share CTA
- **Frontend:** `share.ts` — add `buildReferralShareText()` and referral URL generation
- **Frontend:** new types in `api.ts` — `ReferralStats`
- **Backend:** `handlers.rs` — new `/api/referral/stats` endpoint, referral code generation logic
- **Backend:** `db.rs` — new tables `referrals` and `referral_redemptions`
- **Backend:** `models.rs` — new types for referral data
- **DB:** SQLite migration — add `referrals` and `referral_redemptions` tables
- **API events:** add `share_referral`, `share_referral_telegram`, `referral_click`, `referral_conversion` event types