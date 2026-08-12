## Context

See proposal.md — Why. Sibling change `humanity-score-gate` already assumes GPTZero-first with Originality as swap; this spike exists to validate or replace that pick using the same Russian fixtures. No runtime code lands here; output is a comparison note + recommendation.

## Goals / Non-Goals

**Goals:**
- Shortlist detectors with usable API (or scriptable access) and claimed RU/multilingual support.
- Score a fixed fixture pack on each shortlisted tool and write results in one place.
- Recommend a single gate vendor (and note runners-up) for `humanity-score-gate`.
- Capture practical constraints: pricing/free tier, sentence highlights, score semantics, RU quirks.

**Non-Goals:**
- Implementing the agent revise loop (owned by `humanity-score-gate`).
- Changing site or publish behavior.
- Exhaustive academic benchmarking or multi-detector consensus voting.
- Hard-gating Telegram short copy in this spike.

## Decisions

### 1. Candidate shortlist (evaluate these first)
- **GPTZero** — assumed default in the gate change; document + sentence probs; multilingual flag.
- **Originality.ai** — content/SEO oriented; Multi Language model claims strong RU metrics.
- **Pangram** — low FPR reputation in some benches; multilingual includes Russian; API `predict()`.
- **Copyleaks** — enterprise AI detector API; 30+ languages including Russian.
- **Optional RU-native glance:** GigaCheck / similar RU-first tools if a free demo exists — note only if API is realistic for an agent; otherwise document as out.

Skip free web-only toys without API unless used as a sanity check (results not gate-worthy).

### 2. Fixture pack (same texts for every tool)
| ID | Source | Intent |
|----|--------|--------|
| `shipped-a` | Published magnet body (e.g. синдром…) | Should ideally not look “AI_ONLY” if voice is good |
| `shipped-b` | Second published magnet | Same |
| `raw-llm` | Fresh unedited LLM magnet-style draft | Should fail a useful gate |
| `edited` (optional) | Same raw draft after one voice pass | Expect MIXED / mid scores |

Strip HTML; plain prose only. Record character counts.

### 3. Comparison rubric (columns)
For each tool × fixture: access (API/UI), RU mode, classification or human/AI %, confidence, sentence highlights (y/n), latency, approx cost, notes. Then a **gate fitness** row: can we implement “fail only on exclusive AI” cleanly?

### 4. Deliverable location
- Write `openspec/changes/compare-humanity-detectors/findings.md` with table + recommendation.
- If recommendation differs from GPTZero-first, patch `humanity-score-gate/design.md` in a follow-up (or same session after spike) — not required to merge into product code.

### 5. Secrets
- Trial keys in local env only; never commit. Prefer free/trial tiers for the spike.

### 6. Relation to gate change
- This spike does not block drafting the gate skill, but **should finish before paying for a long-term API plan** or locking calibration forever.

## Risks / Trade-offs

- **[Risk] Vendor benches ≠ our RU magnets** → Mitigation: fixture-based scores beat marketing pages.
- **[Risk] Free tiers throttle mid-spike** → Mitigation: shortlist 3–4; one request per fixture; cache results in findings.md.
- **[Risk] Tools disagree wildly** → Mitigation: pick one source of truth for the gate; note disagreements; do not average.
- **[Risk] “Winner” fails on voice-good shipped text** → Mitigation: document that MIXED-allowed (or human override) is required; feed that into gate calibration.
- **[Trade-off] Small fixture set** → Accepted for speed; expand later if the gate misbehaves.

## Migration Plan

1. Assemble fixtures from repo article bodies + one raw draft.
2. Run shortlist; fill findings.md.
3. Recommend vendor + pass-rule nuance.
4. Hand recommendation to `humanity-score-gate` apply (update design if needed).
5. Archive this change when findings + recommendation are accepted — no code rollback needed.

## Open Questions

- Whether Copyleaks trial friction is worth including if GPTZero/Originality/Pangram already separate the fixtures cleanly.
- Exact shipped magnets chosen for `shipped-a/b` (pick during apply from `frontend/src/articles.ts`).
