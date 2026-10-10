## ADDED Requirements

### Requirement: Misattribution is a blocker of its own
`misattribution` MUST be a repairable blocker category in the grounding dimension. In a source-based post, words presented as a speaker's (a direct quote, a close paraphrase or a translation) MUST be words that the evidence gives to that speaker on that occasion. A speaker is a person or an organisation, named or by role; an official's statement made on an organisation's behalf MAY be credited to the organisation. Words that the evidence gives to another speaker, words moved to another occasion and invented words presented as a real speaker's MUST be reported as `misattribution`, quoting the speech tag together with the words. Uncle Misha's own remarks, his reaction to a quote that the post credits to its speaker, and common sayings MUST NOT be reported. Everyday-observation posts, which have no evidence, MUST NOT receive attribution findings.

#### Scenario: Official's words in Uncle Misha's mouth
- **WHEN** Uncle Misha says a sentence that the evidence attributes to a named official, and the post credits it to nobody else
- **THEN** the gate reports `misattribution` quoting the speech tag and the words

#### Scenario: One speaker's statement credited to another
- **WHEN** a statement that the evidence gives to one speaker is credited to another person or organisation
- **THEN** the gate reports `misattribution`

#### Scenario: Credited quote and Misha's reaction
- **WHEN** the post credits a quote to its speaker and Uncle Misha reacts to it
- **THEN** no attribution finding is reported

#### Scenario: Speaker restored
- **WHEN** a repair restores the real speaker and keeps the quote word for word
- **THEN** the echo check does not return the quote as still present

### Requirement: Misattribution dismissals are restricted
The verifier MAY dismiss a `misattribution` claim only on the ground `faithful-to-source` (the evidence gives the words to the speaker the post names, on that occasion), `persona-opinion` (the line is Uncle Misha's own remark or a reaction that presents nobody else's words as his) or `misread`. The gate MUST keep the claim blocking on any other ground.

#### Scenario: Dismissed as a joke
- **WHEN** the verifier answers a `misattribution` claim with real false and the ground `understood-joke`
- **THEN** the claim keeps blocking

### Requirement: Wrong words and second readings are language defects
Reviewers MUST judge the words as read once, in order, and MUST treat the following as blocking:
- a word, term or idiom that cannot mean what the surrounding text shows was meant (a paronym, a term for another quantity of the same field, an idiom with the opposite sense), as `wrong-phrase`;
- government that changes who does or receives what, as `grammar`;
- words that, read in order, also state something absurd, embarrassing or factually different (an animate noun read as the object of the wrong verb, a modifier after the wrong noun, a pronoun whose nearest matching noun is wrong), as `wrong-phrase`, or as `grammar` for a pronoun.

These defects MUST never be filed as `meaning`. Informal register and a guessable intent MUST NOT excuse them, and the `problem` of such a claim MUST name the intended and the unintended reading.

The following MUST NOT be reported: a reading that needs a rare sense or a parse the endings exclude; wordplay whose two senses are real and whose second sense is the joke; an altered saying; figurative, ironic or colloquial use. The verifier MUST dismiss such claims with `correct-as-written` and a misparse with `misread`.

#### Scenario: Paronym
- **WHEN** the candidate uses a paronym of the intended word
- **THEN** a `wrong-phrase` blocker names both words

#### Scenario: Same-field term
- **WHEN** the candidate names a different quantity of the same field than the evidence reports
- **THEN** a `wrong-phrase` blocker names it

#### Scenario: Object read with the wrong verb
- **WHEN** read in order, an animate noun is taken as the object of the wrong verb, so the sentence also says something absurd
- **THEN** a `wrong-phrase` blocker quotes the span and names both readings, and its fix only reorders or swaps words

#### Scenario: Endings exclude the absurd parse
- **WHEN** inverted word order is unambiguous because the endings show the roles
- **THEN** nothing is reported

#### Scenario: Deliberate pun
- **WHEN** a line plays on two real senses of a word on purpose
- **THEN** nothing is reported, and a claim against it is dismissed as `correct-as-written`

### Requirement: The writer checks the same defects
The writer's polish checklist MUST ask that quotes keep their speakers, that words carry a meaning they have in standard or colloquial Russian, and that no sentence has an accidental absurd second reading. It MUST also state that slang, profanity, irony and deliberate puns stay welcome.

#### Scenario: Polish checklist
- **WHEN** the writer drafts or repairs a post
- **THEN** its polish instructions contain these checks and the statement that the voice stays

### Requirement: Evaluation fixtures stay independent of rubrics
No rubric or prompt shown to a model MAY contain a fixture's text, its injected span or a restatement of a specific fixture. A test MUST fail on a literal overlap, ignoring only the host-printed labels and the CTA.

A held-out set that measures a rubric change MUST meet all of the following:
- an author other than the rubric author writes it, from articles that no other fixture uses;
- every article contributes one clean text, one variant per defect class and clean near-misses for the exemptions;
- three reviewers independent of the evaluated model confirm its labels unanimously, and the labels are then frozen;
- only its sha256 MAY be published before the change, and the final run MUST verify it.

The harness MUST refuse held-out fixtures without an explicit final flag. It MUST record the revision, uncommitted changes, the hashes of the fixtures and of every rubric, the selection and per-fixture results. Every run report MUST be committed.

#### Scenario: Copied example
- **WHEN** a rubric contains the injected span of a fixture
- **THEN** the test suite fails and names the fixture

#### Scenario: Held-out fixture in a tuning run
- **WHEN** a run without the final flag selects a held-out fixture
- **THEN** the harness refuses to run

#### Scenario: Altered held-out file
- **WHEN** the held-out file revealed for the final run does not match the published hash
- **THEN** the final run is invalid

### Requirement: Release bar for this change
A defective fixture passes only when one kept blocker quotes its injected span and has one of its expected categories. The release MUST meet all of the following:
- the #219 fixture set blocks no clean trial and catches at least 90% of its objective-defect trials;
- each motivating miss is caught in at least two of three trials, unless the label panel did not confirm it before the final run;
- the held-out set blocks no clean or near-miss trial and catches at least eight of nine trials per class;
- no class does worse than the current release on the same fixtures.

The report MUST list every miss and every blocker of the new classes with the reader that raised it.

#### Scenario: Pooled pass hides a class
- **WHEN** the pooled objective rate exceeds 90% but held-out misattribution is caught in 7 of 9 trials
- **THEN** the release bar is not met

### Requirement: Convergence holds
Four isolated evening dry runs MUST each reach approval within two activations without a story replacement, and three morning dry runs MUST each succeed. Every blocker of the new classes MUST be recorded and judged real or false, with no false block on a quote, on Uncle Misha's line or on wordplay.

#### Scenario: Slow dry run
- **WHEN** an evening dry run needs a third activation or replaces its story
- **THEN** the convergence requirement is not met

### Requirement: Preflight names its endpoint
The morning and legacy evening preflights MUST name the model endpoint host they verified.

#### Scenario: Nous Portal
- **WHEN** the morning preflight passes against inference-api.nousresearch.com
- **THEN** its log line names that host and not OpenRouter
