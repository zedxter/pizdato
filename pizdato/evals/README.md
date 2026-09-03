# EDD Evaluation Set — pizdato/evals

Golden evaluation set for the **Error-Driven Development (EDD)** pilot in the pizdato.net content pipeline.

## Overview

- **Set:** `golden-001.json` — 13 quality categories from 50 production traces
- **Source taxonomy:** `research/edd-taxonomy-2026-09-03.md` (575 lines, 13 categories)
- **CI gate threshold:** **0.80** (overall pass rate across all categories)
- **Trace coverage:** 50 traces across evening posts, morning posts, promo verdicts, OK.ru, Reddit, and system operations

## File Structure

```
pizdato/evals/
├── golden-001.json    # Eval assertions per category (deterministic + LLM judge)
└── README.md           # This file
```

## Category Index

| ID | Name | Criticality | Eval Type(s) | Expected Pass Rate |
|----|------|-------------|--------------|-------------------|
| COR-01 | Factuality Drift | HIGH | deterministic + llm_judge | 98% |
| COR-02 | Service Leak | HIGH | deterministic + llm_judge | 100% |
| COR-03 | Tone Drift | MEDIUM | deterministic + llm_judge | 98% |
| COR-04 | Length Overflow | HIGH | deterministic | 100% |
| COR-05 | Format Corruption | MEDIUM | deterministic | 100% |
| COR-06 | Missing Structure | MEDIUM | deterministic | 94% |
| COR-07 | Clutter Phrases | MEDIUM | deterministic | 100% |
| COR-08 | Topic Confusion | HIGH | llm_judge | 100% |
| COR-09 | Grammar | MEDIUM | deterministic + llm_judge | 96% |
| COR-10 | Topic & Infrastructure Duplicate | HIGH | deterministic | 98% |
| COR-11 | Draft Quality Decay | MEDIUM | deterministic + llm_judge | 96% |
| COR-13 | Brand Lexicon Inconsistency | MEDIUM | deterministic + llm_judge | 98% |

> COR-10 includes COR-12 (Infrastructure Duplicate) per taxonomy consolidation.

## Assertion Types

| Type | Description | Examples |
|------|-------------|----------|
| `substring_match` | Check for presence or absence of exact text | CTA presence, banned prefixes |
| `banned_words` | Exact or regex-based banned word lists | Service phrases, AI markers, nonsense words |
| `regex` | Pattern-based checks with various match modes | URL preservation, corporate cliches, double spaces |
| `length_check` | Character count validation per platform limit | 1024 (sendPhoto), 4096 (sendMessage) |
| `lookup` | Cross-reference against published history | Content dedup (24h window), idempotency key uniqueness |
| `llm_judge_prompt` | LLM-as-judge with structured JSON response | Factuality verification, tone scoring, grammar check |

## CI Gate Integration

The **0.80 threshold** was calibrated on the 50-trace sample:
- Blocks: factuality errors (COR-01 FAIL) and duplicates (COR-10 FAIL)
- Allows: minor format variations (COR-06 WARN) and small lexical deviations (COR-13 WARN)
- Known production bugs yet unconfirmed (COR-02, 04, 05, 07, 08) are retained at reduced priority

Categories with **100% expected pass rate** but no confirmed defects (COR-02, 04, 05, 07, 08) will be re-evaluated after 100 more traces. If still unconfirmed, they may be removed from the CI gate.

## Per-Trace Metadata Required

When evaluating a trace against `golden-001.json`, the harness must supply:

| Field | Purpose |
|-------|---------|
| `trace_id` | Unique trace identifier |
| `source` | The original input/source text (for factuality checks) |
| `output` | The published/delivered text |
| `draft` | The draft version (for COR-11 quality decay checks) |
| `channel` | Platform identifier: `telegram_send_photo`, `telegram_send_message`, `ok`, `reddit` |
| `format_codified_since` | Format stabilization date per rubric (evening: 2026-08-24, morning: 2026-08-26) |
| `published_at` | Timestamp for dedup window checks |
| `idempotency_key` | Trace_id + date key for infrastructure dedup |

## Running Evals

```bash
# Expected CLI (not yet implemented):
pytest pizdato/evals/ -v
```

The eval harness reads `golden-001.json` to determine which assertions apply per category, then runs each assertion against the trace data and reports per-category pass/fail/warn with an overall score.

## References

- EDD Taxonomy: `research/edd-taxonomy-2026-09-03.md` (in vault)
- EDD Pilot Issue: #106
- Phase 3 tracking: `spec/edd-golden-set`