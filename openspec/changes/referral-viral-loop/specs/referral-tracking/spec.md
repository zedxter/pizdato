## Purpose

Track referral links, attribute referred first-time votes to referrers, and grant referrers an extra vote slot as a reward — creating a self-reinforcing growth loop without weakening existing anti-abuse.

## ADDED Requirements

### Requirement: Voter gets a unique referral code

The system MUST generate a deterministic short referral code for every voter immediately after their first vote. The code SHALL be derived from SHA256(voter_id + ip_salt). The system MUST expose this code to the frontend via a new `/api/referral/stats` endpoint.

**Code format:** The backend SHALL expose both a raw 8-char hex code and a human-readable word-pair label (e.g., `Amber-Falcon`). The word-pair is produced by mapping the first 6 hex chars through two short wordlists (~256 adjectives, ~256 nouns). The `?ref=` URL parameter uses the raw hex code; the frontend displays the word-pair label for readability.

**Collision handling:** If the 8-char hex prefix collides with an existing voter's code, the backend SHALL append characters from the remaining SHA256 digest until the code is unique. The combined hex+word-pair SHALL remain unique across all voters.

#### Scenario: Referral code returned after vote

- **WHEN** the frontend calls `GET /api/referral/stats` for a voter who has voted
- **THEN** the response includes a `ref_code` field with the 8-character hexadecimal code

#### Scenario: No code before vote

- **WHEN** the frontend calls `GET /api/referral/stats` for a voter who has NOT voted
- **THEN** the response includes `ref_code: null`

### Requirement: Referral link format

The referral link MUST use the format `https://pizdato.net/?ref=<code>`. The system MUST preserve the referral code in the `?ref=` query parameter across page navigations (sticky until a vote is cast).

#### Scenario: Visitor arrives via referral link

- **WHEN** a new visitor opens `https://pizdato.net/?ref=abc12345`
- **THEN** the frontend reads the `?ref=` parameter, stores it in session storage, and sends it to the backend when the visitor casts their first vote

#### Scenario: Referral parameter preserved on page load

- **WHEN** a visitor navigates to `https://pizdato.net/?ref=abc12345`
- **THEN** the site loads normally AND the `?ref=` parameter is retained in session state

### Requirement: Referred vote attribution

When a new visitor (no previous vote) casts their first vote while carrying a referral code, the backend MUST record a row in the `referral_redemptions` table linking the referrer's voter_id to the new voter's voter_id. The system MUST NOT attribute a vote to a referral if the referrer code is invalid or the referrer has not voted yet.

#### Scenario: Referred first-time vote succeeds

- **WHEN** a new visitor with `?ref=abc12345` in session casts their first vote via `POST /api/vote?ref=abc12345`
- **THEN** the backend inserts a row in `referral_redemptions` (referrer_id, voter_id of the new voter, timestamp)
- **AND** the new voter's vote counts normally

#### Scenario: Invalid ref code ignored

- **WHEN** a visitor casts their first vote with an unknown `?ref=xxxx`
- **THEN** the backend ignores the ref param and votes normally (no referral_redemptions row)

#### Scenario: Self-referral ignored

- **WHEN** a voter casts a vote with a `?ref=` value that matches their own referral code
- **THEN** the backend ignores the ref and does NOT record a self-referral redemption

#### Scenario: Already-voted visitor with ref

- **WHEN** a visitor who previously voted uses `?ref=abc12345` to return to the site
- **THEN** no new redemption is recorded (only first-time votes qualify)

### Requirement: Vote-again reward

When a voter accumulates 3 unique referred first-time votes (3 rows in referral_redemptions), the system SHALL grant 1 extra vote slot. The extra vote slot MUST be consumed when the referrer casts a second vote. Maximum 2 extra votes per 24 hours per referrer, enforced by the same IP-level rate limiting infrastructure.

**Check logic at vote time:** The backend SHALL evaluate:
1. Count distinct `referred_voter_id` WHERE `referrer_voter_id = ?` → `total_referrals`
2. Count extra_votes WHERE `voter_id = ?` AND `consumed_at IS NULL` → `available_slots`
3. Count extra_votes WHERE `voter_id = ?` AND `consumed_at` within last 24h → `used_recently`
4. Allow extra vote if `total_referrals >= 3 + available_slots` AND `used_recently < 2`

On consumption, the backend SHALL set `consumed_at = datetime('now')` on the oldest unconsumed `extra_votes` row.

#### Scenario: Extra vote granted

- **WHEN** a voter's `referral_redemptions` count reaches 3
- **THEN** the next `/api/stats` or `/api/referral/stats` response includes `extra_vote_available: true`

#### Scenario: Extra vote consumed

- **WHEN** a voter with an available extra vote slot casts a second vote via `POST /api/vote`
- **THEN** the vote is accepted and the extra vote slot is consumed
- **AND** the extra slot counter is decremented

#### Scenario: Extra vote rate limit

- **WHEN** a voter has cast 2 extra votes already in the current 24-hour window
- **THEN** `extra_vote_available` is `false` regardless of accumulated referrals
- **AND** a third extra vote attempt returns 429 or 403

#### Scenario: Reward not earned

- **WHEN** voter has 0-2 referred first-time votes
- **THEN** `extra_vote_available` is `false`

### Requirement: Referral counter visible in SharePanel with progress indicator

The system MUST expose the number of unique referred voters for the current voter via the `/api/referral/stats` endpoint. The response SHALL also include:
- `ref_code_label` — human-readable word-pair (e.g., `Amber-Falcon`) for display
- `ref_code_hex` — raw 8-char hex code used in the URL
- `referred_count` — number of unique referred first-time voters
- `extra_vote_available` — boolean
- `extra_votes_used_today` — integer (0-2) for daily ceiling display

The frontend SHALL display in the SharePanel:
- The referral code as a word-pair label (not raw hex) with a copy button
- "По вашей ссылке проголосовало: N" with a 3-segment progress bar below it
- When `extra_vote_available: true`, a celebration card with explanation and a "Проголосовать ещё" button
- When `extra_votes_used_today > 0`, a note "Максимум 2 дополнительных голоса в сутки. Использовано: X/2"

#### Scenario: Referral counter displayed with progress bar

- **WHEN** voter opens SharePanel after voting
- **THEN** the referral counter shows the correct count of referred first-time voters
- **AND** a 3-segment progress bar shows progress toward the next reward threshold (N/3 segments filled)
- **AND** the referral code is displayed as a word-pair label (not raw hex)

#### Scenario: Extra vote celebration card

- **WHEN** `extra_vote_available: true`
- **THEN** the SharePanel shows a celebration card with "🎉 Ты заработал дополнительный голос!" heading, explanation text, and a "Проголосовать ещё" button

#### Scenario: Daily ceiling indicator

- **WHEN** voter has used 1 or 2 extra votes today
- **THEN** the SharePanel shows "Максимум 2 дополнительных голоса в сутки. Использовано: X/2"

#### Scenario: No referrals yet

- **WHEN** voter has 0 referred votes
- **THEN** the counter shows "По вашей ссылке проголосовало: 0"

### Requirement: Enhanced Telegram share with subscribe CTA

The Telegram share link in the SharePanel MUST pre-fill a message that includes the site URL, vote result, and a subscribe prompt for `@pizdato_net`.

#### Scenario: Telegram share with subscribe CTA

- **WHEN** voter clicks the Telegram share icon after voting
- **THEN** the share text MUST contain the vote result, site URL, and "Подпишись на @pizdato_net — каждый день пиздато/хуёво"

### Requirement: Referral tracking events

The system MUST log referral-related events to `/api/event`:

- `share_referral_copy` — voter copies their referral link
- `share_referral_telegram` — voter shares referral link via Telegram
- `referral_click` — visitor arrives via referral link
- `referral_conversion` — referred visitor casts first vote

#### Scenario: Event types accepted

- **WHEN** a frontend action triggers any of the above events
- **THEN** `/api/event` accepts the event type and logs it
- **AND** unknown event types are rejected with 400

### Requirement: Anti-abuse for referrals

The referral system SHALL NOT bypass existing anti-abuse:
- IP rate limits still apply to all votes (including extra votes)
- Self-referral is silently ignored
- Invalid ref codes are silently ignored
- No PII (email, name) is collected for referral tracking

#### Scenario: Extra vote respects IP rate limit

- **WHEN** a voter's IP has exceeded daily vote request limit
- **THEN** even with `extra_vote_available: true`, the vote attempt returns 429/403

#### Scenario: No PII stored

- **WHEN** a referral redemption is recorded
- **THEN** no email, IP, name, or other personal data is stored — only voter_id references