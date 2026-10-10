## ADDED Requirements

### Requirement: Quotes keep their speakers
The editor MUST report as `unsupported-claim`, quoting the misattributed words, any quotation or close paraphrase that the evidence attributes to one person but the candidate gives to Uncle Misha or to another person. The verifier MUST NOT dismiss such a claim as persona opinion or as faithful to the source. Uncle Misha's own opinions, jokes and common sayings that reuse nobody's words from the evidence MUST NOT be reported as misattribution.

#### Scenario: Official's words in Uncle Misha's mouth
- **WHEN** Uncle Misha says a sentence that the source attributes to a named official
- **THEN** the gate reports `unsupported-claim` quoting that sentence, and the repair restores the speaker or replaces the line

#### Scenario: One person's statement credited to another
- **WHEN** a statement the source attributes to one named person is credited to another person
- **THEN** the gate reports `unsupported-claim` quoting the misattributed statement

#### Scenario: Persona opinion
- **WHEN** Uncle Misha makes a remark that reuses nobody's words from the evidence
- **THEN** no attribution finding is reported

### Requirement: Word meaning and unintended readings are language defects
The proofreader, the editor and the verifier MUST treat as blocking language defects a word used in a meaning it does not have, including paronyms, and word order, modifier placement or pronoun reference that gives a sentence a second reading a typical reader would notice. The verifier MUST keep such a claim unless the quoted text is correct as written. Ambiguity that context resolves for a typical reader and deliberate wordplay, where the second meaning is the joke, MUST NOT be reported.

#### Scenario: Paronym
- **WHEN** the candidate says «одеть куртку» for «надеть куртку»
- **THEN** a `wrong-phrase` blocker names it

#### Scenario: Object read with the wrong verb
- **WHEN** the word order lets an animate object read as the object of the wrong verb, so the sentence also says something absurd
- **THEN** a language blocker quotes the span and the fix restores an unambiguous order

#### Scenario: Context resolves it
- **WHEN** a phrase could attach two ways in isolation but the sentence admits only one sensible reading
- **THEN** nothing is reported

#### Scenario: Deliberate pun
- **WHEN** a verdict line or the wisdom plays on a double meaning on purpose
- **THEN** nothing is reported

### Requirement: The writer checks the same defects
The writer's polish checklist MUST include keeping quotes with their speakers, using every word in its dictionary meaning and avoiding word order that produces a second reading.

#### Scenario: Polish checklist
- **WHEN** the writer drafts or repairs a post
- **THEN** its polish instructions name these three checks

### Requirement: Evaluation fixtures stay independent of rubrics
No rubric or prompt shown to a model MAY contain a fixture's text or its injected defect, and a test MUST fail when one does. Fixtures that measure a rubric change MUST be committed before the change, MUST NOT be run while it is tuned, MUST have their labels checked by reviewers independent of the evaluated model, and MUST be reported separately together with their result on the current release.

#### Scenario: Copied example
- **WHEN** a rubric contains the injected defect of a fixture
- **THEN** the test suite fails and names the fixture

#### Scenario: Held-out report
- **WHEN** the release evaluation runs
- **THEN** the held-out fixtures are reported separately with their result on the current release

### Requirement: Preflight names its endpoint
The morning and legacy evening preflights MUST name the model endpoint host they verified.

#### Scenario: Nous Portal
- **WHEN** the morning preflight passes against inference-api.nousresearch.com
- **THEN** its log line names that host and not OpenRouter
