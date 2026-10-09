## Purpose

Publish every scheduled evening post that passes objective editorial checks on the same evening, keep taste from blocking delivery, and end an unpublishable evening visibly instead of looping.

## ADDED Requirements

### Requirement: Blockers and suggestions are distinct
The editorial gate MUST classify each finding by category: spelling, grammar, punctuation, wrong-phrase, meaning, unsupported-claim, unusable-source, repetition and ai-slop are blockers; humor, wisdom, style and category are suggestions. The host MUST derive approval from blockers only.

#### Scenario: Taste remarks only
- **WHEN** a review returns only suggestions
- **THEN** the candidate is approved for that exact payload and suggestions are recorded

#### Scenario: Objective defect
- **WHEN** a review returns a verified grammar blocker
- **THEN** the candidate is not approved and the writer receives a repair request

#### Scenario: Replacement categories
- **WHEN** a verified blocker is repetition or unusable-source
- **THEN** the story is replaced instead of repaired

### Requirement: Claimed blockers are verified
Every blocker claimed by a model reviewer MUST be checked by an independent verifier request that receives the candidate, evidence, confirmed history and the claims. Only an explicit dismissal with a named ground MAY clear a claim; an unanswered claim MUST keep blocking; duplicate verdict ids MUST fail closed. A spelling, grammar, punctuation or wrong-phrase claim MUST stay blocking unless the ground is that the text is correct as written or the claim misread it. The verifier MAY correct a confirmed claim's category but MUST NOT turn a repair category into a replacement category. Host-deterministic findings MUST NOT be sent for verification.

#### Scenario: Verifier escalates a stock opener
- **WHEN** the editor claims ai-slop for a recycled opener and the verifier answers repetition
- **THEN** the claim stays ai-slop and the story is repaired, not replaced

#### Scenario: Language claim dismissed as taste
- **WHEN** the verifier dismisses «меньше земной больше чем в тысячу раз» on the ground of taste
- **THEN** the claim keeps blocking

#### Scenario: Pedantic paraphrase complaint
- **WHEN** the editor claims a faithful paraphrase is unsupported and the verifier dismisses it
- **THEN** the claim is recorded as dismissed and does not block

#### Scenario: Verifier failure
- **WHEN** the verifier answer is missing or malformed after one retry
- **THEN** no approval is granted and the worker retries later

### Requirement: Language errors have a dedicated reader
The gate MUST send the exact candidate text, without history or sources, to a proofreader limited to spelling, grammar, punctuation and wrong-phrase findings, in addition to the editor.

#### Scenario: Misspelling missed by the editor
- **WHEN** the proofreader reports «поллуны» and the verifier confirms it
- **THEN** publication is blocked until the spelling is fixed

### Requirement: Every revision is reviewed fresh
The editor MUST NOT receive earlier drafts or findings of the current story. On a revision the host MUST name the sections changed since the previous review. Texts of abandoned stories MAY be supplied for freshness.

#### Scenario: Repair review
- **WHEN** a repaired draft is reviewed
- **THEN** the editor request contains changedSections and no earlier finding text of that story

### Requirement: Suggestions get one polishing pass
Suggestions from the first review of a story MUST be passed to the writer together with that review's blockers, except category-fit remarks; an approved first draft MUST be published as is; suggestions from later reviews MUST NOT be passed or block. A taste remark about the wisdom MUST NOT forbid that wisdom.

#### Scenario: Later suggestion
- **WHEN** a second review returns only a wisdom suggestion
- **THEN** the post is approved

### Requirement: Host-owned caption sections
The evening writer MUST return hook, body paragraphs, verdict texts, brainstormed wisdom options and a chosen wisdom. The host MUST render the fixed layout and CTA, measure the caption, enforce the 950-character and 1024-UTF-16 limits and a 6–15-word wisdom, choose a fitting unflagged brainstormed wisdom when the chosen one does not fit, require the persona in any grammatical case, and report exact measured numbers in findings.

#### Scenario: Short wisdom with a fitting option
- **WHEN** the chosen wisdom has 3 words and an option has 9
- **THEN** the host uses the option without another model request

#### Scenario: Overlong caption
- **WHEN** the rendered caption has 980 characters
- **THEN** the finding states 980 and the minimum number of characters to cut, and unlocks only the story text

### Requirement: Deterministic lint before review
The host MUST reject known stock phrases, recurring language errors, first-person narration, links in sections, more than one emoji and three or more persona mentions before any model review, quoting the exact match.

#### Scenario: Recycled opener
- **WHEN** the hook contains «листал ленту за кофе»
- **THEN** an ai-slop finding with that span returns the draft for repair without replacing the story

### Requirement: Repairs change only flagged sections
A repair MUST keep every section without a located finding byte-identical; an unlocated finding MUST unlock all sections. A caption identical to one that received verified blockers MUST never be reviewed again. Within one review round, a quoted defect still present verbatim (punctuation, case and ё significant) MUST return to the writer once before another review. Sections that held blockers MUST be named as changed in the next review; a re-review of unchanged text MUST be a full review.

#### Scenario: Writer rewrites an unflagged hook
- **WHEN** only the Хуёво line was flagged and the writer also returns a new hook
- **THEN** the published caption keeps the reviewed hook

#### Scenario: Echo
- **WHEN** the repaired caption still contains the quoted misspelling
- **THEN** the writer receives a still-present finding without an editor request

### Requirement: Bounded convergence
A story MUST be replaced after four editorial repairs, after three activations of failed mechanical repairs, after three consecutive source-verification failures or after three consecutive review failures. Unusable supporting evidence MUST become a repair finding and replacements MUST continue on the next tick without backoff. Replacement MUST clear the story's evidence, raw draft, blockers, suggestions and search allowance; the findings record why it was abandoned. Abandoned or published sources MUST NOT be drafted again.

#### Scenario: Dead supporting link
- **WHEN** a supporting URL fails DNS resolution during verification
- **THEN** the writer receives a repair finding naming that URL

#### Scenario: Stuck story
- **WHEN** the fifth review of one story still has a verified blocker
- **THEN** a different story is drafted

### Requirement: Evening deadline
An unpublished edition in discovering, drafting, reviewing, repairing, ready or blocked phase MUST be cancelled automatically with a recorded reason at 23:00 Europe/Berlin of its edition date, and the cron log MUST show it. The deadline MUST be checked again right before the send intent is written. A send MUST start only with at least 90 seconds of activation budget left, and delivery MUST reserve 120 seconds. Sending, delivery-unknown and published editions MUST NOT be expired. Dry runs MUST ignore the deadline.

#### Scenario: Friday cannot finish
- **WHEN** the 2026-10-09 edition is still unapproved at 23:00
- **THEN** it becomes cancelled with an automatic deadline reason, is never sent, and the next evening runs alone

#### Scenario: Uncertain send
- **WHEN** an edition is delivery-unknown after its deadline
- **THEN** it stays delivery-unknown for reconciliation

### Requirement: Retries align with the cron tick
Routine continuation MUST become runnable on the next five-minute tick despite start-time jitter.

#### Scenario: Jittered tick
- **WHEN** a repair verdict is recorded at 18:00:01.5 and the next tick starts at 18:05:00.4
- **THEN** that tick works on the edition

### Requirement: Configurable model endpoint
Model requests MUST use OpenRouter by default and MAY use one HTTPS OpenAI-compatible endpoint for every role and both slots. Keys MUST be bound to their hosts: the OpenRouter key only for openrouter.ai, NOUS_API_KEY only for nousresearch.com, PIZDATO_LLM_API_KEY for any host; otherwise the run MUST stop before sending a request. OpenRouter-only fields MUST NOT be sent to other endpoints; temperature MUST NOT be sent to OpenAI reasoning models, whose reasoning effort is configurable separately for writers and reviewers. A read-only preflight MUST prove a plain reply and strict JSON from every configured model, the real reviewer schemas from the reviewer model and a tool call from the discovery model.

#### Scenario: Nous Portal with gpt-6.1-sol
- **WHEN** the base URL is https://inference-api.nousresearch.com/v1 with NOUS_API_KEY
- **THEN** requests use that key, reasoning_effort and max_completion_tokens, and no provider, reasoning object or temperature field

#### Scenario: Forgotten Nous key
- **WHEN** the base URL points to Nous Portal and only OPENROUTER_API_KEY is set
- **THEN** no request is sent and the edition is blocked with a missing-credential reason

#### Scenario: Missing tool support
- **WHEN** the discovery model returns text instead of a tool call during preflight
- **THEN** the preflight fails and names the model

### Requirement: Discovery searches news
Discovery search MUST query a news index and return original article URLs, titles and summaries.

#### Scenario: Bing redirect links
- **WHEN** a news result links through a Bing redirect
- **THEN** discovery receives the original HTTPS article URL

### Requirement: Release bar
Before the configuration is switched or released, the real-model evaluation MUST run three trials of every fixture with that configuration and record its settings. No clean-fixture trial MAY be blocked, at least 90% of objective-defect trials MUST be rejected with the injected defect named, and every miss MUST be listed. Results for borderline fixtures (taste or irony) MUST be reported separately.

#### Scenario: Default model misses a factual error
- **WHEN** a configuration approves the misattributed-name fixture
- **THEN** that configuration is not released as the scheduled default

### Requirement: Existing safeguards remain
Exact-payload approval, durable journals, reconciliation of uncertain sends, shared publication locking, confirmed history and the morning schedule and bounded policy MUST remain in force.

#### Scenario: Changed text after approval
- **WHEN** the approved caption changes before sending
- **THEN** sending requires a fresh approval
