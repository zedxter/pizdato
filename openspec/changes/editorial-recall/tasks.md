## 1. Specification

- [x] 1.1 Record intent and evidence in issue #222, docs/idd-editorial-recall.md and this change.
- [x] 1.2 Complete five independent spec reviews and record them in review.md; pass strict validation.
- [ ] 1.3 Obtain owner approval.

## 2. Fixtures first

- [x] 2.1 Guard test against fixture text in rubrics and prompts.
- [x] 2.2 Dev set: minimal pairs on three dry-run articles, the dry-run slip and the panel's natural find, with labels checked by the panel.
- [x] 2.3 Sealed held-out set by an independent author, with unanimous label checks; commit its sha256 and post it on #222 before any gate or rubric change.
- [x] 2.4 Label audit of the motivating misses by an independent panel.
- [x] 2.5 Harness: `--final` for held-out fixtures, the span-and-category pass rule, run metadata and committed run reports (TDD).

## 3. Implementation

- [x] 3.1 Preflight lines name the endpoint host (TDD).
- [x] 3.2 `misattribution` category with restricted dismissal grounds (TDD).
- [x] 3.3 Rubrics: attribution, wrong words and second readings, verifier mapping, writer polish, published examples, removal of incident phrases and restatements.
- [x] 3.4 Tune on the dev set only, at most three rounds (one rubric commit plus one dev run each).

## 4. QA and deployment

- [x] 4.1 Independent check of the final rubric diff for restatements of any fixture.
- [x] 4.2 Final run with `--final` and the release baseline, back to back, meeting the release bar of this change. Not met for held-out second readings (5/9) and held-out clean texts; released by owner decision (IDD decision 2), gap tracked in #225.
- [x] 4.3 Four evening and three morning isolated dry runs meeting the convergence requirement.
- [ ] 4.4 Code review, green CI, merge, install, `--check`; observe the next evening against the rollback trigger.
