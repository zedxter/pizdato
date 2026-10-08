## ADDED Requirements

### Requirement: Confirmed shared editorial history
Both scheduled generators and their editors MUST receive complete confirmed morning and evening posts from the preceding 14 Europe/Berlin calendar days.

#### Scenario: Evening checks a morning motif
- **GIVEN** a confirmed morning post with a recurring premise in its wish
- **WHEN** the evening writer and editor receive context
- **THEN** that full morning post is included alongside confirmed evening posts

#### Scenario: Missing history versus broken history
- **GIVEN** no previous confirmed publications exist
- **WHEN** history is loaded
- **THEN** an empty history is permitted
- **AND** an I/O or parsing failure for an expected confirmed record blocks the run instead of silently producing empty history

### Requirement: Fresh concrete copy
A candidate MUST be rejected when it repeats a recent comic premise, stock hook, or punchline, including paraphrases, except fixed attribution and required CTA.

#### Scenario: Rephrased habitual scene
- **GIVEN** recent posts repeatedly frame Misha as drinking while reading news
- **WHEN** a new candidate swaps the drink or describes choking on it
- **THEN** the editor requests a different scene or direct story hook

#### Scenario: Relevant source vocabulary
- **GIVEN** a verified story is about a beverage
- **WHEN** the post reports that fact without a narrator drinking ritual
- **THEN** beverage vocabulary alone does not cause rejection

### Requirement: Russian correctness and coherent wisdom
The editor MUST evaluate Russian grammar and intended meaning as separate dimensions for the entire payload, including wisdom and wish.

#### Scenario: Agreement error
- **WHEN** a candidate has incorrect gender, number, case or verb agreement
- **THEN** the grammar dimension fails and publication is blocked

#### Scenario: Grammatical nonsense
- **WHEN** a wisdom links cooling coffee to evidence from an empty mug without a coherent explanation
- **THEN** the meaning dimension fails even if the sentence meets the word limit

#### Scenario: Natural colloquial humor
- **WHEN** a concrete coherent joke uses natural colloquial phrasing and the brand's profanity
- **THEN** the editor does not reject it merely for being informal

### Requirement: Host-enforced editorial approval
The host MUST obtain a valid editorial approval from a separate request for the exact rendered publication payload before any Telegram send.

#### Scenario: Surface validation succeeds but editor rejects
- **GIVEN** the candidate passes all length, source and formatting checks
- **WHEN** any editorial dimension fails
- **THEN** Telegram is not called and no success marker or pending send intent is written

#### Scenario: Reviewer failure
- **WHEN** review is missing, malformed, contradictory, unavailable or times out
- **THEN** the run fails without publishing or using an unchecked fallback

#### Scenario: Text changes after approval
- **GIVEN** approval is associated with the host-computed hash of a payload
- **WHEN** the payload changes before sending
- **THEN** approval is invalidated and the changed payload requires fresh review

### Requirement: Bounded revision
The host MUST allow at most three candidate-review rounds per run.

#### Scenario: Repeated rejection
- **WHEN** the third candidate fails review
- **THEN** the run saves a local rejected draft with findings and exits unsuccessfully without publication

### Requirement: Existing publication safeguards
The revised workflow MUST preserve existing slot contracts and transport safeguards.

#### Scenario: Morning and evening delivery
- **WHEN** an approved post is sent
- **THEN** morning remains wisdom plus wish without promotional content and evening retains category, verified source cover and exact CTA
- **AND** existing schedules, destination checks, locks, duplicate prevention and uncertain-send reconciliation remain enforced

#### Scenario: Non-publishing verification
- **WHEN** either runner uses check or dry-run mode
- **THEN** no Telegram send, publication marker or pending intent is created

### Requirement: Reproducible editorial resources
Installed editorial resources MUST match the reviewed repository version used by both jobs.

#### Scenario: Deployment verification
- **WHEN** a reviewed bundle is installed
- **THEN** file hashes and source revision are recorded and read back before scheduled publishing resumes
