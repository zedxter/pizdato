## Purpose

Preserve useful verified channel stories through bounded repairs while keeping full independent editorial checks before publication.

## ADDED Requirements

### Requirement: Repairable rejection preserves the subject
A repairable rejection MUST return actionable findings for revision of the current subject.

#### Scenario: Repair a pronoun or an overstatement
- **WHEN** a draft has incorrect agreement, unclear wisdom, a weak joke or an unsupported detail removable without losing the verified story
- **THEN** the writer receives a repair instruction with the findings
- **AND** the evening writer keeps its source/story and may use verified supporting evidence

### Requirement: Unusable subjects are replaced
A repeated recent subject or an unusable source MUST trigger immediate replacement.

#### Scenario: Repetition takes priority
- **WHEN** both grammar and freshness fail
- **THEN** the writer receives a replacement instruction without first repairing the repeated subject

#### Scenario: Unreliable source versus repairable factual error
- **WHEN** the evidence cannot support the central story
- **THEN** the writer selects a different verified story and cover
- **AND** a missing caveat or removable unsupported detail in an otherwise supported story instead permits repair

### Requirement: Separate bounded story and revision budgets
Each run MUST permit at most three subjects, each with an initial submission and at most two repaired submissions.

#### Scenario: All nine submissions fail repairably
- **WHEN** both repairs of the first and second subjects fail
- **THEN** the next subject gets its own initial submission and two repairs
- **AND** failure of the third subject's second repair ends the run without sending

#### Scenario: Structural failures do not evade limits
- **WHEN** a submitted payload fails JSON, format, source or cover validation
- **THEN** that submission consumes the same bounded repair opportunity without sending

#### Scenario: Immediate replacement spends one subject
- **WHEN** three successive subjects receive replacement verdicts
- **THEN** the run stops after three submissions without sending

### Requirement: Every repaired payload receives a full fresh review
Each repaired payload MUST pass the unchanged full editorial rubric and host validations before sending.

#### Scenario: Repair exposes a new defect
- **WHEN** grammar is corrected but the revision introduces an unsupported claim
- **THEN** the full review rejects that revision

#### Scenario: Earlier revisions are not publication history
- **WHEN** the editor receives earlier drafts of the same current subject
- **THEN** retaining that subject is permitted
- **AND** confirmed publication history and already abandoned subjects still constrain freshness

#### Scenario: Exact approval and editor failure
- **WHEN** an approved payload changes, or review is unavailable, malformed or contradictory
- **THEN** no unchecked payload is sent and no pending/success send record is created

### Requirement: Retry state is owned and observable by the host
The host MUST own subject/revision counters and record each submission outcome locally.

#### Scenario: Inspect a repaired run
- **WHEN** a draft is rejected and then repaired
- **THEN** local records identify subject number, revision number, findings and next action for both submissions

#### Scenario: Writer switches source during repair
- **WHEN** a repair submission substitutes a different primary source without a replacement instruction
- **THEN** it cannot bypass validation or reset any budget

### Requirement: Existing operational limits remain in force
Revision MUST NOT extend the 20-minute runner deadline or alter publication transport protections.

#### Scenario: Late initial submission can still be repaired
- **WHEN** the first draft is submitted on the final discovery turn and receives repair findings
- **THEN** the writer gets a separate bounded repair opportunity within the remaining run deadline

#### Scenario: Research or time is exhausted
- **WHEN** discovery exhausts its existing budget or the runner reaches its deadline
- **THEN** the run stops without unchecked publication even if editorial opportunities remain
