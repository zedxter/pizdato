# Morning publication

## ADDED Requirements

### Requirement: Morning schedule
The OS cron daemon MUST launch the morning runner daily at 10:00 Europe/Berlin independently of Hermes.

#### Scenario: Scheduled run
- **WHEN** the server reaches 10:00 local time
- **THEN** the morning runner starts without changing evening scheduling

### Requirement: Wisdom and wish
The publication MUST contain attribution to Uncle Misha, one original Russian wisdom in quotation marks and one short witty wish of 5–25 words. Wisdom MUST contain 10–15 words. The runtime MUST apply post-polish with telegram/warm/ru. The message MUST NOT contain links, domains, site promotion, vote statistics, calls to vote, reaction prompts, greetings or first-person narration.

#### Scenario: Clean draft
- **WHEN** a witty wisdom passes validation and polish
- **THEN** the host renders the fixed attribution, quoted wisdom and a separate witty wish

#### Scenario: Promotional draft
- **WHEN** the model returns a link, site mention, CTA or voting statistics
- **THEN** the draft is rejected before publication

### Requirement: Fresh wisdom
The runtime MUST reject wisdom matching a recent archived morning wisdom.

#### Scenario: Repeated thought
- **GIVEN** the wisdom appeared in the last 30 morning archives
- **WHEN** the model submits it again
- **THEN** the runtime requests a fresh thought before sending

### Requirement: Safe publication
The host MUST use TELEGRAM_SEND_MESSAGE with the existing named account, exact channel ID and no parse mode. It MUST preserve canonical morning archives, daily markers, exclusive execution and pending-send reconciliation.

#### Scenario: Published or uncertain
- **GIVEN** a daily marker or unresolved pending send exists
- **WHEN** the live runner starts
- **THEN** it skips the published day or fails for reconciliation without invoking generation

### Requirement: Non-publishing verification
Check and dry-run modes MUST NOT send a message or write a publication marker/pending intent.

#### Scenario: Dry run
- **WHEN** the operator invokes --dry-run
- **THEN** a reviewable draft is saved only in the runtime state directory
