## 1. Backend: Database migration

- [ ] 1.1 Add `referral_redemptions` table to `backend/src/models.rs` (schema: id, referrer_voter_id, referred_voter_id UNIQUE, created_at)
- [ ] 1.2 Add `extra_votes` table to `backend/src/models.rs` (schema: id, voter_id, earned_at, consumed_at NULL, UNIQUE(voter_id, earned_at))
- [ ] 1.3 Add `extra_votes` index on voter_id
- [ ] 1.4 Add migration SQL to startup init in `backend/src/db.rs`

## 2. Backend: Referral stats endpoint

- [ ] 2.1 Add `ReferralStats` response struct (ref_code, referred_count, extra_vote_available)
- [ ] 2.2 Add referral code generation: `substr(sha256(voter_id || ip_salt), 0, 8)` as a method on AppState
- [ ] 2.3 Add `GET /api/referral/stats` handler in `backend/src/handlers.rs`
- [ ] 2.4 Register the new route in the Axum router

## 3. Backend: Referral vote attribution

- [ ] 3.1 Parse `?ref=` query parameter in `POST /api/vote` handler
- [ ] 3.2 Add `record_referral_redemption()` method in `backend/src/db.rs`: validates ref code, prevents self-referral, inserts redemption row
- [ ] 3.3 Add `count_referrals_for_voter()` method in `backend/src/db.rs`
- [ ] 3.4 Add `extra_vote_available()` check in `backend/src/db.rs` (3 redemptions → 1 slot, max 2 consumed in 24h)
- [ ] 3.5 Return `extra_vote_available` flag in `/api/stats` response when applicable

## 4. Backend: Allowlist referral events

- [ ] 4.1 Add `share_referral_copy`, `share_referral_telegram`, `referral_click`, `referral_conversion` to `ALLOWED_EVENT_TYPES` in handlers.rs

## 5. Frontend: Referral API types and fetch

- [ ] 5.1 Add `ReferralStats` type to `frontend/src/api.ts`
- [ ] 5.2 Add `fetchReferralStats()` function to `frontend/src/api.ts`
- [ ] 5.3 Add `castVoteWithRef(ref?)` variant or modify `castVote()` to pass `?ref=` param

## 6. Frontend: Enhanced Telegram share with subscribe CTA

- [ ] 6.1 Add `buildSubscribeShareText()` in `frontend/src/share.ts` — result + site URL + "Подпишись на @pizdato_net — каждый день пиздато/хуёво"
- [ ] 6.2 Update `telegramShareUrl()` to use the enhanced text when a referral code exists

## 7. Frontend: Referral code display in SharePanel

- [ ] 7.1 Add referral section to SharePanel.tsx showing the referral code as copyable link
- [ ] 7.2 Add referral counter: "По твоей ссылке проголосовало: N"
- [ ] 7.3 Add extra vote badge: "🎉 Ты заработал дополнительный голос!" when `extra_vote_available: true`
- [ ] 7.4 Add "Проголосовать ещё" button that triggers a second vote when extra vote is available
- [ ] 7.5 Track referral events: copy, Telegram share, click

## 8. Frontend: Referral session handling

- [ ] 8.1 Read `?ref=` param from URL on page load in `App.tsx`
- [ ] 8.2 Store ref code in `sessionStorage`
- [ ] 8.3 Pass ref code on `POST /api/vote` via query param
- [ ] 8.4 Clear ref from `sessionStorage` after first vote

## 9. Testing

- [ ] 9.1 Integration test: referral code deterministic for same voter_id
- [ ] 9.2 Integration test: referred first-time vote creates redemption row
- [ ] 9.3 Integration test: self-referral silently ignored
- [ ] 9.4 Integration test: extra vote available after 3+ referrals
- [ ] 9.5 Integration test: extra vote rate limit (max 2 per 24h)
- [ ] 9.6 Integration test: invalid ref code ignored
- [ ] 9.7 Unit test: enhanced Telegram share text contains subscribe CTA
- [ ] 9.8 Manual: verify referral link displayed in SharePanel