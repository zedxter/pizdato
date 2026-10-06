# Evening publication

## ADDED Requirements

### Requirement: Independent schedule
The system MUST launch the evening task daily at 18:00 Europe/Berlin without reading Hermes configuration or resources.

#### Scenario: Hermes moved
- **GIVEN** Hermes is unavailable and OpenRouter/Composio credentials are valid
- **WHEN** the server reaches 18:00 local time
- **THEN** OS cron starts the evening runner

### Requirement: Publication contract
The agent MUST follow the owner-provided weekday editorial categories, third-person Uncle Misha voice, humor without politics/drama, 10–15-word wisdom, post-polish and exact site CTA. The final post MUST contain at most 950 characters. The agent MUST use a validated public HTTPS OG/Twitter image extracted from the selected news source. The agent MUST NOT generate covers or publish without a source cover. Publication MUST use the named Composio account and exact channel ID.

#### Scenario: Cover available
- **WHEN** a public HTTPS cover validates and copy passes the editorial checks
- **THEN** the agent sends a photo with a plain caption to chat -1004350521393 using account pizdato-net-channel

### Requirement: Duplicate protection
The runner MUST serialize executions and skip an existing daily success marker. An unresolved pending send MUST block automatic retry.

#### Scenario: Already published
- **GIVEN** published/telegram/evening-YYYY-MM-DD.md exists in the canonical vault
- **WHEN** the runner starts
- **THEN** it exits successfully without invoking the agent

#### Scenario: Uncertain send
- **GIVEN** a pending record exists without a success marker
- **WHEN** the runner starts
- **THEN** it fails without invoking the agent and requests reconciliation

### Requirement: Observable outcome
The runner MUST fail when the runtime fails or when a live run finishes without a daily success marker. A successful send MUST be archived with its image URL and message ID before pending intent is removed.

#### Scenario: Runtime failure
- **WHEN** the runtime exits unsuccessfully
- **THEN** the runner exits unsuccessfully and logs the failure

### Requirement: Non-publishing verification
Check and dry-run modes MUST forbid publication and mutation of publication markers or pending records.

#### Scenario: Dry run
- **WHEN** the operator invokes --dry-run
- **THEN** the runtime prepares content for review without sending it
