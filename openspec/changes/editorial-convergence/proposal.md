## Why

Since 2026-10-07 no evening post has reached @pizdato_net. On 2026-10-09 the persistent worker submitted 41 drafts between 18:00 and 23:35 Berlin and approved none: brittle deterministic limits bounced drafts the model could not count, the LLM editor re-issued its own earlier complaints (anchoring) while missing real defects, every taste remark blocked publication, each repair rewrote the whole caption, and unlimited repairs had no deadline. The owner wants interesting, human-sounding posts without AI slop or language errors that actually get published. Evidence and intent: docs/idd-editorial-convergence.md, issue #219.

## What Changes

- Split editorial findings into objective blockers and taste suggestions; only blockers stop a post; suggestions get one polishing pass per story.
- Add a dedicated proofreader that sees only the text and an independent verifier that must confirm every model-claimed blocker.
- Review every revision fresh: no earlier drafts or findings of the current story reach the editor; the host names changed sections instead.
- Have the writer return sections; the host renders, measures, chooses a fitting brainstormed wisdom, lints stock phrases and known errors, locks unflagged sections during repairs and bounces echoes.
- Bound convergence: four editorial repairs per story, a mechanical-failure cap, a 23:00 Berlin edition deadline, retries aligned to the five-minute tick.
- Make the model endpoint configurable (OpenRouter default, OpenAI-compatible endpoints such as Nous Portal) with a capability preflight; add a separate editor model setting.
- Owner-visible decisions: wisdom floor 6 words (ceiling 15 and 950-character caption unchanged); weekday category becomes guidance.

## Capabilities

### New Capabilities
- `channel-editorial-convergence`: blocker/suggestion verdicts with verification, fresh reviews, host-owned caption sections and bounded convergence.

### Superseded requirements of unarchived changes
- `evening-delivery`: "Repair until approved" (unlimited repairs, no count-driven replacement); in "Durable unfinished editions", the recovery of missed dates across midnight and the scenario "Delayed edition crosses midnight"; in "Bounded work with continuing retries", "without an overall editorial-attempt ceiling" and "Only confirmed delivery or an explicit operator cancellation SHALL close an edition" (the deadline also closes it); in "Observable delayed work", the scenario "Persistent disagreement"; in "Discovery converges or retries visibly", the search source (now a news index).
- `editorial-revision`: "Separate bounded story and revision budgets" for the evening slot (morning unchanged); "Every repaired payload receives a full fresh review" becomes a fresh review that names changed sections.
- `channel-editorial-gate`: the verdict shape (decision plus five booleans) and the "Bounded revision" requirement for the evening slot.
All other requirements of these changes (durable journal, exact-payload approval, reconciliation, shared publication lock, confirmed history, destination checks) remain in force.

### Modified Capabilities
None in canonical openspec/specs; the earlier channel changes remain unarchived.

## Impact

deploy/evening (worker, writer, store, CLI, prompts, new compose module), deploy/editorial (gate, rubrics, new proofreader and verifier rubrics, fixtures, eval), deploy/morning (shared gate usage), tests, docs. No Rust backend, frontend, schedule or credential change. Deployment reuses the existing installer; the stuck 2026-10-09 edition is cancelled automatically by the deadline.
