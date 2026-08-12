## Context

See proposal.md — **Status: CANCELLED**. Spike `compare-humanity-detectors` rejected free DistilRuBERT as a gate backend; paid detector APIs are out of preference. This design is retained only as a record of the approach we will **not** ship.

## Goals / Non-Goals

**Goals (historical — not to implement):**
- Agent detect → targeted revise → re-detect loop with a SaaS or local detector.

**Non-Goals / final decision:**
- **Do not implement** the automated humanity-score gate.
- Do not adopt GPTZero/Originality/Pangram while they require paid API access for agent use.
- Do not pretend DistilRuBERT (or similar free HF classifiers) is production-ready for RU magnets after failed fixture separation.
- Keep brand-voice checklist as the only hard editorial gate.

## Decisions

### Final: cancel detector gate
- **Choice:** No automated humanity score in the publish path.
- **Why:** No free backend fits volume + RU quality bar; paid SaaS declined.
- **Fallback:** Voice constraints in `content-magnet` + `pizdato-channel` skill.

### Historical (superseded) detector choice
- GPTZero-first was the planned SaaS default; DistilRuBERT was evaluated as free alternative and **failed** fixture separation (trunc512: all human; paragraphs: shipped magnets look AI). Details in sibling `findings.md`.

## Risks / Trade-offs

- **[Trade-off] No statistical AI-slop gate** → Accepted; rely on voice review and human taste.
- **[Risk] Future free detector appears** → Re-open a spike with the same fixture pack before resurrecting this change.

## Migration Plan

1. Do not apply tasks for this change.
2. Archive or delete `humanity-score-gate` after accepting the spike recommendation.
3. Continue magnets with voice checklist only.

## Open Questions

- None for implementation. Optional later: re-evaluate if a credible free RU+API detector appears.
