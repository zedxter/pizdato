# Detector comparison findings

Status: **spike scored on free/OSS path** (2026-08-12). Commercial API keys still absent; DistilRuBERT evaluated on all fixtures.

Host: no NVIDIA GPU; ~23 GiB RAM. Heavy Binoculars / Fast-DetectGPT local stacks skipped.

## Access decisions

| Tool | In this spike? | Notes |
|------|----------------|-------|
| GPTZero / Originality / Pangram | Deferred | Need accounts/keys; GPTZero web free ≠ API |
| Copyleaks | Skipped | Friction |
| GigaCheck | Skipped | No quick agent API |
| **`barmyman/distilrubert-ai-detector`** | **Ran** | Local HF RU binary classifier |
| Fast-DetectGPT / fastdetect.net | Desk only | Open method; hosted API still needs a key |
| Binoculars | Skipped | GPU / multi‑GB |

## Fixtures

See `fixtures/README.md`.

## Live scores — DistilRuBERT

Model card: `LABEL_0` = human, `LABEL_1` = AI. Repro: `score_distilrubert.py` (venv local, gitignored).

### Truncated whole-doc (first 512 tokens)

| Fixture | trunc512 P(AI) | Label |
|---------|----------------|-------|
| shipped-a | **0.0006** | HUMAN |
| shipped-b | **0.0006** | HUMAN |
| raw-llm | **0.0007** | HUMAN |
| edited | **0.0007** | HUMAN |

**No separation** — raw control looks as “human” as shipped magnets.

### Paragraphs ≥200 chars (length-weighted mean P(AI))

| Fixture | para mean P(AI) | para max P(AI) |
|---------|-----------------|----------------|
| shipped-a | 0.76 | ~0.999 |
| shipped-b | 0.90 | ~0.999 |
| raw-llm | 0.999 | ~0.999 |
| edited | 0.95 | ~0.999 |

Almost everything mid-length is flagged AI, including **shipped** voice. Raw is slightly “hotter,” but **shipped would fail any strict AI threshold**.

### Interpretation

DistilRuBERT is **length-regime sensitive** and **not gate-fit** for pizdato magnets as tested:

- Long windows → everything human  
- ~200–300 char paragraphs → everything AI  
- Cannot implement a stable “fail only exclusive AI / pass MIXED” rule that passes shipped magnets and fails `raw-llm`

## Gate fitness

| Candidate | Map to fail-only-on-AI-only? | Fixture separation? |
|-----------|------------------------------|---------------------|
| DistilRuBERT local | No (unstable) | **Fail** |
| GPTZero / Originality / Pangram | Likely yes (unknown until keys) | Untested here |
| Voice checklist only | N/A (not a detector) | Editorial, not statistical |

## Recommendation

**Do not implement an automated humanity-score / detect→revise gate.**

Reasons:
1. Free local RU classifier (`distilrubert-ai-detector`) **failed fixture separation** (see scores above).
2. Strong SaaS detectors (GPTZero, Originality, Pangram) are **paywalled for API / agent use**; that is out of preference for this project.
3. Weekly magnet volume is tiny, but a **free web paste quota** is not a reliable agent loop — and without a free API that works on RU longform, the feature adds process cost without a trustworthy backend.

**What to keep instead:** brand-voice checklist (already in `content-magnet` + channel skill) as the only hard editorial gate before publish. Optional manual paste into any free web detector is human judgment, not product automation.

**Sibling change:** cancel / do-not-apply `humanity-score-gate` (or reduce it to voice-checklist docs only — no detector loop).

### Pass-rule nuance

N/A — no detector source of truth selected.

## Pricing / API desk notes

- DistilRuBERT: free, local, CPU OK.  
- fastdetect.net: open method behind hosted API (Bearer key + credits).  
- GPTZero: free web quota; API usually paid.  
- Smaller $0 API signups exist but still require accounts — optional later.
