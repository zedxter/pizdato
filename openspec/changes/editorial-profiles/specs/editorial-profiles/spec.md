## ADDED Requirements

### Requirement: The gate reviews through a validated publication profile
The editorial gate MUST be constructed with a publication profile. The profile MUST provide:
- an id and the language `ru`;
- an optional persona, whether verdict lines are printed, and optional categories;
- extra suggestion categories, content-type names and a maximum length of at most 4096 characters;
- extra editor fields in order, with a repetition check for them;
- text for every rubric slot.

Construction and every `--check` path MUST validate the profile by composing all four rubrics. An invalid profile MUST fail with code `EDITORIAL_CONFIG` before any model request. The gate MUST NOT contain publication-specific names, fields, content types, suggestion categories or rubric passages outside the profile; the internal request titles are excepted.

#### Scenario: Gate without a profile
- **WHEN** a caller constructs the gate without a profile
- **THEN** construction throws `EDITORIAL_CONFIG`

#### Scenario: Profile without id or with another language
- **WHEN** a profile has no id, or its language is not `ru`
- **THEN** validation throws `EDITORIAL_CONFIG`

#### Scenario: Neutral profile
- **WHEN** the gate reviews a text with a profile that has no persona, verdict lines, categories, fields or extra suggestions
- **THEN** the review completes
- **AND** the composed prompts, schemas and messages contain none of the banned channel terms in the design
- **AND** the composed rubrics pass the readability lint

#### Scenario: Structurally different example profile
- **WHEN** the example column profile, with a persona, first-person narration allowed, a `title` field and no verdict lines, reviews a text through fake requests
- **THEN** the review completes, and a repeated `title` yields that profile's host repetition blocker

### Requirement: Rubrics are composed strictly from core templates and profile slots
The editor, proofreader, verifier and writer-polish rubrics MUST be composed from the core templates and the profile slots. Composition MUST throw `EDITORIAL_CONFIG` when:
- a template names a slot that the profile lacks;
- the profile has a slot that none of the four templates uses;
- a placeholder remains after composition.

Every caller MUST obtain the writer polish through composition. No production code may read a rubric template directly.

#### Scenario: Missing slot
- **WHEN** a profile omits a slot used by the editor template
- **THEN** validation throws and names the slot

#### Scenario: Unused slot
- **WHEN** a profile defines a slot that none of the four templates uses
- **THEN** validation throws and names the slot

#### Scenario: Leftover placeholder
- **WHEN** a slot's text itself contains `{{`
- **THEN** validation throws

### Requirement: Prose and enums agree
Validation MUST throw `EDITORIAL_CONFIG` when:
- the composed verifier text names a dismissal ground that is not in the profile's ground enum, or omits a ground the enum contains;
- the composed editor text disagrees in the same way with the suggestion enum or the content-type names;
- the profile has no persona and a composed rubric names a persona.

#### Scenario: Persona ground in prose without a persona
- **WHEN** a profile without a persona has verifier slot text that mentions `persona-opinion`
- **THEN** validation throws

### Requirement: Channel requests and decisions are identical to the baseline release
For the `pizdato-channel` profile:
- the composed editor, proofreader, verifier and writer-polish rubrics MUST be byte-identical to the rubric files of the baseline release da0b2ed;
- for the golden cases in the design, every request (the exact serialized messages and options), the returned verdict, every recorded review entry and the gate snapshot MUST equal the goldens captured from the baseline release through its own API;
- the `network.check` preflight requests MUST also equal their goldens.

#### Scenario: Composed rubric
- **WHEN** the channel profile composes the editor rubric
- **THEN** its sha256 equals the pinned sha256 of `deploy/editorial/editor.md` at da0b2ed

#### Scenario: Writer polish used by every caller
- **WHEN** the morning agent, the legacy evening agent or the evening network builds its writer prompt
- **THEN** the polish it uses equals `deploy/editorial/writer.md` at da0b2ed

#### Scenario: Recorded evening revision
- **WHEN** the gate reviews the golden evening revision with a source, changed sections and a verifier round
- **THEN** the serialized requests, the verdict, the record entries and the snapshot equal the goldens

#### Scenario: Golden capture provenance
- **WHEN** the capture script runs against a worktree that is not at the baseline commit, or against a gate that accepts a profile
- **THEN** it refuses to write goldens

### Requirement: Profile-dependent suggestions and grounds
Each of these MUST exist only when the profile declares the matching feature:

| Exists only when | Item |
| --- | --- |
| a persona is declared | the ground `persona-opinion`, in the schema and among the misattribution dismissal grounds |
| verdict lines are declared | the ground `verdict-contrast` |
| categories are declared | the ground `loose-category` and the suggestion `category` |
| the profile lists them | further suggestion categories, such as the channel's `wisdom` |

Blocker categories, the language and attribution dismissal rules and every host rule MUST be identical for all profiles. For the channel, every enum MUST keep its current order.

#### Scenario: Persona ground without a persona
- **WHEN** the profile has no persona
- **THEN** the verifier schema does not offer `persona-opinion`
- **AND** a misattribution claim can be dismissed only as `faithful-to-source` or `misread`

#### Scenario: Neutral editor schema
- **WHEN** the neutral profile builds its editor options
- **THEN** the category enum contains neither `wisdom` nor `category`

#### Scenario: Channel options keep their identity
- **WHEN** a caller imports `editorOptions`, `proofreaderOptions` or `verifierOptions`
- **THEN** it receives the same objects that a `pizdato-channel` gate sends

### Requirement: Profile fields replace the wisdom argument
The gate MUST accept publication-specific inputs only as `fields` declared by the profile. A field is missing when its key is absent or its value is undefined. A missing or undeclared field, or a text longer than the profile's maximum, MUST throw `EDITORIAL_CONFIG` before any request. The profile's repetition check MUST turn a field that repeats confirmed history into a host `repetition` blocker.

#### Scenario: Repeated wisdom
- **WHEN** the channel profile reviews a post whose `wisdom` field repeats a confirmed publication
- **THEN** the gate adds the host blocker «Wisdom repeats a confirmed publication.» exactly as before

#### Scenario: Undeclared or missing field
- **WHEN** a caller passes a field that the profile does not declare, or omits a declared field
- **THEN** the review throws before any request is sent

#### Scenario: Text over the maximum
- **WHEN** the text is longer than the profile's maximum length
- **THEN** the review throws before any request is sent

### Requirement: Configuration errors do not consume stories
An `EDITORIAL_CONFIG` error MUST NOT count as a reviewer failure and MUST NOT abandon a story. The evening worker MUST record it as the last error and stop the activation. The morning run MUST fail before any model request.

#### Scenario: Broken profile in the evening
- **WHEN** an installed release has a profile that fails validation and an evening activation runs
- **THEN** no story is abandoned, the failure counter is unchanged, and the last error names the composition failure

#### Scenario: Broken profile at check time
- **WHEN** `--check` runs on such a release for either slot
- **THEN** it exits non-zero without printing PREFLIGHT_OK

### Requirement: Evaluation is per profile and gates production use
- The evaluation harness MUST run with a profile.
- It MUST load that profile's fixtures and optional sealed held-out set, map fixture inputs to the profile's fields, and compute the release bar per profile.
- It MUST check contamination against the profile's composed rubrics.
- It MUST record the profile id, the profile module sha256 and the composed rubric sha256 values.
- The channel MUST keep its current fixture paths as defaults.
- A profile under `deploy/editorial/profiles/` other than `pizdato-channel` MUST have fixtures and a committed evaluation report that meets at least the channel's default release bar.

#### Scenario: Channel report provenance
- **WHEN** the harness runs the channel profile
- **THEN** the recorded composed rubric sha256 values equal those of the da0b2ed rubric files

#### Scenario: Fixture text placed in a slot
- **WHEN** a profile slot contains a fixture n-gram
- **THEN** the contamination guard reports it

#### Scenario: Unevaluated production profile
- **WHEN** a profile is added under `deploy/editorial/profiles/` without fixtures or a passing report
- **THEN** the repository test fails
