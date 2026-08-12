## 1. Detector access and calibration

- [ ] 1.1 Obtain detector API access (GPTZero-first; document Originality as fallback) and store the key in a local env var (never commit)
- [ ] 1.2 Run calibration spike: score ≥2 shipped magnets + 1 raw unedited LLM magnet-style draft; record classifications/probabilities
- [ ] 1.3 Lock v1 pass rule from calibration (default: fail only on AI-only; add numeric floor only if calibration shows it is needed) and document it for the skill

## 2. Detector adapter

- [ ] 2.1 Add a thin CLI or script that sends Russian text with multilingual mode and prints classification, probabilities, and sentence-level highlights when available
- [ ] 2.2 Document usage, env var name, rate-limit/error handling, and how pass/fail is computed

## 3. Agent skill and loop

- [ ] 3.1 Add a Cursor skill for the humanity-score gate: voice checklist first → detect → targeted revise → re-detect
- [ ] 3.2 Encode hard rules: MIXED/HUMAN pass, AI-only fail, max 5 attempts, voice outranks score, escalate with best draft + reports on exhaust
- [ ] 3.3 Wire skill into magnet draft handoff (reference from content-magnet / publish checklist docs)

## 4. Scope and verify

- [ ] 4.1 Confirm TG teasers/short copy are advisory-only in v1 (no hard block) in skill and docs
- [ ] 4.2 Dry-run the full loop on one sample magnet draft; verify pass path and exhaust→human override path
- [ ] 4.3 Use the gate on the next real magnet before publish (or record explicit human override if exhausted)
