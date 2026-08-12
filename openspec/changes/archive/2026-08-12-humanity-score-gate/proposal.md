## Why

Magnet and Telegram drafts are often LLM-assisted, and raw model prose reads as generic AI even when the topic is right. Before anything ships, we wanted an agent step that scores the draft with an external AI-text detector and revises until it clears a humanity threshold — without sanding off the pizdato brand voice.

## Status: CANCELLED — do not implement

Spike `compare-humanity-detectors` found no **free** detector that separates our RU fixtures reliably. Paid SaaS (e.g. GPTZero API) is out of preference. **Decision: do not build the detect→revise gate.** Editorial bar remains the existing brand-voice checklist only.

Kept below for history; tasks should not be applied.

## What Changes

- ~~Add an agent-driven **humanity-score gate**~~ — cancelled.
- No detector API integration; no regenerate-until-score loop.
- No new `content-magnet` requirement tying publish to a detector score.

## Capabilities

### New Capabilities
- ~~`humanity-score-gate`~~ — cancelled (do not sync to main specs).

### Modified Capabilities
- ~~`content-magnet` detector gate~~ — cancelled.

## Impact

- None on product code if this change is archived/dropped without apply.
- See `compare-humanity-detectors/findings.md` for the evidence trail.
