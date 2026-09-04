## Purpose

Track referral links, attribute referred first-time votes to referrers, and grant referrers an extra vote slot as a reward — creating a self-reinforcing growth loop without weakening existing anti-abuse.

## ADDED Requirements

### Requirement: Voter gets a unique referral code

The system MUST generate a deterministic short referral code for every voter immediately after their first vote. The code SHALL be the first 12 hex characters of SHA256(voter_id + ip_salt). If two voters produce the same 12-character prefix, the system SHALL append a 2-character base36 counter suffix (00–zz) and re-check until the code is unique (max 1296 attempts). The system MUST expose this code to the frontend via a new `/api/referral/stats` endpoint.

#### Scenario: Referral code returned after vote

- **WHEN** the frontend calls `GET /api/referral/stats` for a voter who has voted
- **THEN** the response includes a `ref_code` field with the 12-character hexadecimal code

#### Scenario: No code before vote

- **WHEN** the frontend calls `GET /api/referral/stats` for a voter who has NOT voted
- **THEN** the response includes `ref_code: null`

#### Scenario: Code collision resolved

- **WHEN** two different voters produce the same SHA256 prefix
- **THEN** the system appends a base36 counter suffix to the second voter's code and re-checks until unique
- **AND** the second voter's stored code includes the suffix

### Requirement: Referral link format

The referral link MUST use the format `https://pizdato.net/?ref=<code>`. The system MUST preserve the referral code in the `?ref=` query parameter across page navigations (sticky until a vote is cast).

#### Scenario: Visitor arrives via referral link

- **WHEN** a new visitor opens `https://pizdato.net/?ref=abc12345`
- **THEN** the frontend reads the `?ref=` parameter, stores it in session storage, and sends it to the backend when the visitor casts their first vote

#### Scenario: Referral parameter preserved on page load

- **WHEN** a visitor navigates to `https://pizdato.net/?ref=abc12345`
- **THEN** the site loads normally AND the `?ref=` parameter is retained in session state

### Requirement: Referred vote attribution

When a new visitor (no previous vote) casts their first vote while carrying a referral code, the backend MUST record a row in the `referral_redemptions` table linking the referrer's voter_id to the new voter's voter_id. The system MUST NOT attribute a vote to a referral if the referrer code is invalid or the referrer has not voted yet. The `referral_redemptions` table MUST have indexes `idx_referral_redemptions_referrer` on `referrer_voter_id` and `idx_referral_redemptions_created` on `created_at`.

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

When a voter accumulates 3 unique referred first-time votes (3 rows in referral_redemptions), the system SHALL grant 1 extra vote slot. Each `extra_votes` row SHALL be created atomically when a redemption is inserted and the referrer's redemption count first reaches a multiple of 3 (the 3rd, 6th, 9th, … redemption). Concretely, on each `referral_redemptions` insert the backend checks whether `count(referral_redemptions WHERE referrer_voter_id = ?) >= 3 * (SELECT COUNT(*) FROM extra_votes WHERE voter_id = ?)`; if true, it inserts an `extra_votes` row with `consumed_at=NULL`. The extra vote slot MUST be consumed when the referrer casts a second vote. Maximum 2 extra votes per 24 hours per referrer, enforced by the same IP-level rate limiting infrastructure.

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

#### Scenario: Celebration on first reward

- **WHEN** a voter earns their first extra vote slot
- **THEN** the SharePanel shows a celebration animation (confetti effect) once
- **AND** displays "Вот это сила приглашений! Ты заработал дополнительный голос"

### Requirement: Referral counter visible in SharePanel

The system MUST expose the number of unique referred voters for the current voter via the `/api/referral/stats` endpoint. The frontend SHALL display "По вашей ссылке проголосовало: N" in the SharePanel.

#### Scenario: Referral counter displayed

- **WHEN** voter opens SharePanel after voting
- **THEN** the referral counter shows the correct count of referred first-time voters

#### Scenario: No referrals yet

- **WHEN** voter has 0 referred votes
- **THEN** the counter shows "По вашей ссылке проголосовало: 0"

#### Scenario: Progress indicator shown

- **WHEN** voter has 1-2 referred votes and opens SharePanel
- **THEN** the counter includes a progress bar at N/3 width
- **AND** the text reads "X/3 → ещё Y голосов до награды" (e.g. "1/3 → ещё 2 голоса до награды")

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