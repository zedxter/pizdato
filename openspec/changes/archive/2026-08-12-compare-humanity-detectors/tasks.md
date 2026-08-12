## 1. Fixtures

- [x] 1.1 Pick two shipped magnet bodies from the articles registry and export plain-text fixtures (`shipped-a`, `shipped-b`) with char counts
- [x] 1.2 Create one raw unedited LLM magnet-style draft fixture (`raw-llm`); optionally one voice-edited variant (`edited`)
- [x] 1.3 Store fixtures under this change (e.g. `fixtures/`) without secrets; note source slug/date in a README

## 2. Tool access

- [x] 2.1 Confirm trial/API access for GPTZero, Originality.ai, and Pangram (env keys local-only) — **none present; deferred commercial; scored free DistilRuBERT instead**
- [x] 2.2 Decide whether to include Copyleaks in this spike or skip for friction; note decision in findings
- [x] 2.3 Optionally try one RU-native demo (e.g. GigaCheck) for a qualitative note only if free and quick — **skipped; used HF DistilRuBERT RU classifier**

## 3. Run comparison

- [x] 3.1 Score every fixture on each shortlisted tool; capture classification / probabilities / highlights availability — **DistilRuBERT complete; SaaS tools deferred pending keys**
- [x] 3.2 Fill `findings.md` with the comparison table, RU notes, pricing/API notes, and gate-fitness (can map to fail-only-on-AI-only)

## 4. Recommend and hand off

- [x] 4.1 Write a clear recommendation: primary vendor for `humanity-score-gate`, runner-up, and any pass-rule nuance from the fixtures — **updated: do not implement detector gate (no free fit; paid declined)**
- [x] 4.2 If the recommendation differs from GPTZero-first, update `humanity-score-gate/design.md` Decisions accordingly — **cancelled gate; proposal+design marked do-not-implement**
- [x] 4.3 Mark this spike done for archive when the recommendation is accepted
