## 1. Specification

- [x] 1.1 Record evidence and intent in issue #219, docs/idd-editorial-convergence.md and this change.
- [ ] 1.2 Complete five independent spec reviews, record them in review.md, pass strict validation and obtain owner approval, including the decisions listed in the IDD.

## 2. TDD implementation

- [x] 2.1 Gate: blocker/suggestion contract, proofreader, verifier, fresh reviews, four-repair evening cap, retry of malformed answers (gate.test.mjs).
- [x] 2.2 Host sections: rendering, normalization, measurement, wisdom choice, stock-phrase and known-error lint, section locking, echo detection (compose.test.mjs).
- [x] 2.3 Worker: mechanical repairs within an activation, one polishing pass, changed-section reviews, replacement cleanup and caps, deadline expiry, tick-aligned retries, legacy markers, resume phase (delivery.test.mjs, Rust runner tests).
- [x] 2.4 Writer and provider: section schema, repair context, discovery source choice, configurable endpoint and dialects, capability preflight, Telegram send deadline (delivery-network.test.mjs, agent.test.mjs).
- [x] 2.5 Rubrics and prompts: editor, proofreader, verifier, writer, discovery, shared polish; morning uses the shared gate.

## 3. QA and deployment

- [ ] 3.1 Real-model evaluation of all fixtures (three trials) with the configuration to be released, meeting the release bar (no clean trial blocked, at least 90% of objective-defect trials rejected with the defect named, every miss listed, borderline fixtures reported separately); isolated end-to-end dry runs; record settings, results and limitations.
- [x] 3.0 Address the five spec reviews and the code reviews (review.md).
- [ ] 3.2 Implementation review and green CI; merge through PR.
- [ ] 3.3 Install under both slot locks, verify manifest, `--status` and `--check`; confirm the 2026-10-09 edition expired.
- [ ] 3.4 Observe the next scheduled evening through confirmed delivery or documented cancellation.
