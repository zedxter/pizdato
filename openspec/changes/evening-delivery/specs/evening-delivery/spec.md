## Purpose

Keep every scheduled evening edition recoverable until its independently approved content is confirmed delivered, including after editorial rejection, discovery failure or worker interruption.

## ADDED Requirements

### Requirement: Repair until approved
The evening workflow SHALL apply every repair finding to the same usable story and independently review the entire revised caption. It MUST NOT discard a story or abandon an edition solely because a revision or total story count was reached. Replacement SHALL require a repeated story, fundamentally unsupported core, or unusable source/cover; the replacement SHALL undergo the same checks. No text SHALL publish unless all gate dimensions pass and approval matches the exact payload. Morning scheduling and editorial policies SHALL remain unchanged; final publication coordination SHALL be shared to prevent history races.

#### Scenario: More than two repairs
- **WHEN** a usable story receives ten successive repair verdicts before approval
- **THEN** all ten revisions are eligible for full re-review and the approved final payload is sent once without count-driven story replacement

#### Scenario: Irreparable candidate
- **WHEN** the story core cannot be verified or repeats a confirmed publication
- **THEN** the workflow records why it was abandoned and prepares another candidate without dropping the edition

### Requirement: Durable unfinished editions
The system SHALL retain edition date, latest draft, source evidence, review findings and pending work across bounded worker activations, crashes and midnight. It SHALL resume the same repairable draft rather than restart discovery. Delayed drafts MUST be refreshed and re-reviewed against current confirmed history and evidence before sending. Missed scheduled dates since activation SHALL remain visible and recoverable; a newer edition SHALL NOT overwrite an older one.

#### Scenario: Restart during revision
- **WHEN** the worker stops after a repair verdict and restarts later
- **THEN** it resumes with that draft and all unresolved findings, and stale approvals cannot authorize delivery

#### Scenario: Delayed edition crosses midnight
- **WHEN** yesterday's unfinished edition is resumed today
- **THEN** its identity remains yesterday's edition, stale relative-time language and evidence are revalidated, and it is not miscounted as today's edition

### Requirement: Discovery converges or retries visibly
Ineffective search SHALL switch to an independent source-feed or verified reserve-candidate path. The workflow MUST still fetch usable source evidence and validate a source-owned cover and editorial quality. Exhausting one discovery allowance SHALL preserve progress and schedule another attempt, not mark an edition complete or silently skip it.

#### Scenario: Irrelevant searches
- **WHEN** repeated search results provide no usable candidate
- **THEN** the worker tries an independent discovery source within the same activation and, if necessary, leaves the edition pending for retry

### Requirement: Bounded work with continuing retries
One worker activation SHALL have finite time and external-call limits. Unfinished work SHALL resume periodically without an overall editorial-attempt ceiling. Retriable service errors, review-format failures and timeouts SHALL retain work with error, attempt count and next retry time. Unresolved configuration/authentication/state-integrity failures SHALL remain visibly blocked and undergo safe read-only rechecks without sending unapproved content. Only confirmed delivery or an explicit operator cancellation SHALL close an edition. Runnable editions SHALL receive fair work opportunities so an indefinitely rejected older draft cannot starve newer editions.

#### Scenario: Provider outage
- **WHEN** the model service fails for multiple activations and later recovers
- **THEN** the edition remains pending during the outage and preparation resumes when the service is available

#### Scenario: Malformed review
- **WHEN** the editor returns invalid JSON or a contradictory verdict
- **THEN** no approval is granted, the candidate is retained and a later full review can resume

#### Scenario: Older edition keeps failing review
- **WHEN** an older edition continues receiving repair verdicts while a newer edition is eligible
- **THEN** both receive bounded work opportunities and the newer edition can publish once approved

### Requirement: Delivery confirmation and reconciliation
The workflow SHALL serialize evening workers and durably record send intent before sending. Confirmed Telegram message identity SHALL close the edition and prevent retries from sending duplicates. A send with unknown outcome SHALL be blocked from automatic resend until explicit reconciliation proves delivery or non-delivery. A reconciled message MUST match the intended channel and stored caption/media, with durable verification evidence; unrelated message IDs MUST NOT close an edition. Definite transient non-delivery SHALL retry without discarding an approved draft, subject to revalidation. Before either morning or evening sends, confirmed-but-unfinalized records SHALL be restored to publication history. Final history validation and send/finalization SHALL be serialized across both slots; a history change after review SHALL require renewed review. No test/dry-run SHALL send or alter live publication state.

#### Scenario: Successful send followed by restart
- **WHEN** a confirmed edition is encountered after restart
- **THEN** the recorded message and publication marker suppress another send

#### Scenario: Confirmation precedes archive crash
- **WHEN** delivery confirmation was saved but the process crashed before updating its archive and marker
- **THEN** recovery finalizes that publication idempotently before either slot can use history to approve delivery, and never resends the confirmed post

#### Scenario: Morning publishes during evening review
- **WHEN** morning publication changes confirmed history while an evening draft is under review
- **THEN** the evening sender detects the changed history and obtains renewed review before any send

#### Scenario: Lost send response
- **WHEN** a send times out after it could have reached Telegram
- **THEN** the edition is marked delivery-unknown, no automatic resend occurs, and status explains that reconciliation is needed

#### Scenario: Incorrect reconciliation message
- **WHEN** an operator supplies a message from another channel or with a different payload
- **THEN** reconciliation rejects it and the edition remains delivery-unknown

### Requirement: Observable delayed work
A read-only status command SHALL show each open edition's phase, age, revision count, latest findings/error, next retry and delivery uncertainty. The scheduler SHALL retain timestamped lifecycle logs without secrets. Work older than thirty minutes past its due time SHALL be identified as overdue until confirmed or explicitly cancelled.

#### Scenario: Persistent disagreement
- **WHEN** the editor continues rejecting repairable drafts beyond the scheduled publication time
- **THEN** revisions continue across activations and status exposes the overdue edition and current findings instead of reporting success
