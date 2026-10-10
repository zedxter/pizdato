## ADDED Requirements

### Requirement: The gate reviews through a publication profile
The editorial gate MUST be constructed with a publication profile. The profile MUST provide an id, a language, an optional persona, whether the publication prints verdict lines, its content-type names, its extra editor fields in order, a repetition check for those fields, and text for every rubric slot. The gate MUST NOT contain publication-specific names, fields, content types or rubric passages outside the profile.

#### Scenario: Gate without a profile
- **WHEN** a caller constructs the gate without a profile
- **THEN** construction throws

#### Scenario: Neutral profile
- **WHEN** the gate reviews a text with a profile that has no persona, no verdict lines and no extra fields
- **THEN** the review completes, and its composed prompts, schemas and messages contain none of the channel terms (pizdato, Пиздато, Хуёво, Миша, Misha, Мудрость, wisdom, the weekday category names); the internal request titles are excluded from this check

### Requirement: Rubrics are composed strictly from core templates and profile slots
The editor, proofreader, verifier and writer-polish rubrics MUST be composed from a core template and the profile's slots. Composition MUST throw when a template names a slot that the profile lacks, when the profile has a slot that no template uses, or when any placeholder remains after composition.

#### Scenario: Missing slot
- **WHEN** a profile omits a slot used by the editor template
- **THEN** composition throws and names the slot

#### Scenario: Unused slot
- **WHEN** a profile defines a slot that no template uses
- **THEN** composition throws and names the slot

### Requirement: Channel requests are byte-identical to the previous release
For the `pizdato-channel` profile, the composed editor, proofreader, verifier and writer-polish rubrics MUST be byte-identical to the rubric files of release da0b2ed. For the same inputs, every request that the gate sends (messages, response schema, title and options) MUST be identical to the request da0b2ed sends.

#### Scenario: Composed rubric
- **WHEN** the channel profile composes the editor rubric
- **THEN** its sha256 equals the sha256 of `deploy/editorial/editor.md` at da0b2ed

#### Scenario: Recorded evening review
- **WHEN** the gate reviews a recorded evening revision with a source, changed sections and a verifier round
- **THEN** the recorded requests equal the golden requests captured on da0b2ed

### Requirement: Persona and verdict dismissal grounds depend on the profile
The verifier ground `persona-opinion` MUST exist, both in the schema and among the misattribution dismissal grounds, only when the profile declares a persona. The ground `verdict-contrast` MUST exist only when the profile declares verdict lines. Every other category, ground and host rule MUST be identical for all profiles.

#### Scenario: Persona ground without a persona
- **WHEN** the profile has no persona
- **THEN** the verifier schema does not offer `persona-opinion`, and a misattribution claim can be dismissed only as `faithful-to-source` or `misread`

### Requirement: Profile fields replace the wisdom argument
The gate MUST accept publication-specific inputs only as `fields` declared by the profile. It MUST throw on an undeclared field or a missing declared field. The profile's repetition check MUST turn a field that repeats confirmed history into a host `repetition` blocker.

#### Scenario: Repeated wisdom
- **WHEN** the channel profile reviews a post whose `wisdom` field repeats a confirmed publication
- **THEN** the gate adds the host blocker «Wisdom repeats a confirmed publication.» exactly as before

#### Scenario: Undeclared field
- **WHEN** a caller passes a field that the profile does not declare
- **THEN** the review throws before any request is sent

### Requirement: A new publication ships with its own evaluation
A profile other than `pizdato-channel` and the neutral test profile MUST NOT be used in production until it has its own fixtures and an evaluation run under the harness, with release bars recorded in its change.

#### Scenario: Evaluation fixtures name their profile
- **WHEN** the harness loads a fixture
- **THEN** it reviews the fixture with the profile the fixture names, and `pizdato-channel` when none is named
