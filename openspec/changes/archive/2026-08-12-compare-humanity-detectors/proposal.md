## Why

`humanity-score-gate` assumes a single detector vendor (GPTZero-first), but we have not yet compared real options on Russian magnet-length copy. Before wiring the agent loop to a paid API, we need a short research spike that scores the same fixtures across candidate tools and recommends one source of truth.

## What Changes

- Run a structured comparison of AI-text / “humanity” detectors relevant to pizdato (Russian articles, LLM-assisted then edited).
- Build a small fixture set: shipped magnets, a raw LLM control draft, and optionally a voice-edited middle draft.
- Record API/access, pricing, RU/multilingual support, score shape (classification vs %), sentence-level highlights, and pass/fail behavior on fixtures.
- Produce a short recommendation that feeds `humanity-score-gate` (confirm or replace the GPTZero-first assumption).
- No product/runtime behavior change in this spike (`skip_specs: true`).

## Capabilities

### New Capabilities

_(none — research/docs only; `skip_specs: true` in `.openspec.yaml`)_

### Modified Capabilities

_(none)_

## Impact

- Planning artifacts and a comparison write-up under this change (or a linked note).
- Possible API trial keys / free-tier usage for candidate tools — secrets stay out of git.
- Downstream: update `humanity-score-gate` design/tasks if the spike picks a different vendor or pass-rule nuance.
- Does not implement the agent gate, site code, or publish ritual.
