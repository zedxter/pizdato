## Purpose

Gate LLM-assisted editorial drafts through an external AI-text detector and a bounded revise loop so published magnets clear a calibrated humanity bar without overriding brand voice.

## ADDED Requirements

### Requirement: Detector scores in-scope drafts before publish handoff
Before a content-magnet draft is handed off for the publish ritual, the agent MUST obtain an AI-text detection result from the configured detector for the full article prose (title/dek may be included), using multilingual/Russian-capable analysis when the draft is in Russian.

#### Scenario: Magnet draft ready for gate
- **WHEN** the agent finishes an initial magnet draft that passes the brand-voice checklist
- **THEN** it submits that draft to the configured detector and records the classification and relevant probability scores

### Requirement: Pass rule allows mixed authorship
A draft MUST pass the gate when the detector’s document classification is not exclusively AI (v1: `HUMAN_ONLY` or `MIXED`, or an equivalent non-`AI_ONLY` outcome). Pure `AI_ONLY` (or vendor-equivalent “fully AI”) MUST fail.

#### Scenario: Mixed classification
- **WHEN** the detector classifies the draft as mixed human/AI
- **THEN** the gate treats the draft as passing the score rule

#### Scenario: Fully AI classification
- **WHEN** the detector classifies the draft as AI-only
- **THEN** the gate fails and a revise attempt is required (unless max attempts are already exhausted)

### Requirement: Failed drafts get targeted revision not blind regen
On gate failure, the agent MUST revise primarily the spans the detector flags as AI-like (sentence- or paragraph-level when available), MUST restate brand-voice constraints as hard rules in the revise pass, and MUST NOT use generic “humanizer synonym” rewriting as the primary strategy.

#### Scenario: Sentence-level highlights available
- **WHEN** the detector returns per-sentence AI highlights on a failing draft
- **THEN** the next attempt rewrites those highlighted spans while preserving structure, facts, pivot, and CTAs

### Requirement: Bounded regenerate loop
The detect → revise → re-detect loop MUST stop when the draft passes or when a configured maximum attempt count is reached (default 5 including the first detection). The agent MUST NOT loop indefinitely.

#### Scenario: Pass within attempts
- **WHEN** a revised draft meets the pass rule before the attempt limit
- **THEN** the agent releases that draft for publish handoff with the final score report

#### Scenario: Attempts exhausted
- **WHEN** the attempt limit is reached without a passing score
- **THEN** the agent stops auto-revision, presents the best candidate plus all score reports, and requires explicit human override or further human edit before publish

### Requirement: Voice constraints outrank the detector
Every revise pass MUST preserve brand-voice constraints (ironic light roast, meaningful пиздато, no moralizing, no war/military comedy framing, dual CTA intact). Improving the detector score MUST NOT be used as justification to violate those constraints.

#### Scenario: Score vs voice conflict
- **WHEN** a rewrite would raise the humanity score but violate brand-voice constraints
- **THEN** the agent keeps the voice-compliant wording and continues the loop or escalates rather than shipping the voice-breaking rewrite

### Requirement: Threshold calibrated to shipped magnets
The project MUST calibrate the initial pass interpretation against at least two already-published magnets plus one raw unedited LLM draft so the gate does not reject the project’s own acceptable voice. The calibrated pass rule and attempt limit MUST be documented for the agent skill.

#### Scenario: Calibration spike
- **WHEN** operators run the detector on existing shipped magnets and a raw LLM control draft
- **THEN** they record the scores and set the v1 pass rule so shipped magnets would pass and the raw control would fail (or clearly document if that separation is impossible)

### Requirement: Short Telegram copy out of hard gate in v1
Telegram teasers, цитата lines, and other sub-threshold-length posts MUST NOT be subject to the same hard humanity gate in v1; operators MAY run a manual or advisory check. Magnets remain the hard-gated content type.

#### Scenario: Short teaser drafted
- **WHEN** the agent drafts a same-day Telegram magnet teaser
- **THEN** the humanity-score hard gate does not block publish solely based on that short text’s detector score
