## 1. Specification

- [x] 1.1 Record intent and evidence in issue #222, docs/idd-editorial-recall.md and this change.
- [ ] 1.2 Complete five independent spec reviews, record them in review.md, pass strict validation and obtain owner approval.

## 2. Fixtures first

- [ ] 2.1 Build the held-out set (three fixtures per class and three clean captions) and the dev fixture from dry-run articles; check labels with an independent panel; commit before any rubric change.
- [ ] 2.2 Guard test against fixture text in rubrics and prompts; evaluation runs selected fixtures and reports sets.

## 3. Implementation

- [ ] 3.1 Rubric rules: attribution (editor, verifier); word meaning and unintended readings (proofreader, editor, verifier); writer polish.
- [ ] 3.2 Preflight lines name the endpoint host (TDD).
- [ ] 3.3 Tune on the dev set only, at most three rounds.

## 4. QA and deployment

- [ ] 4.1 Final three-trial run of all fixtures meets the release bar; held-out fixtures reported with their result on the current release.
- [ ] 4.2 Four isolated evening dry runs and one morning dry run.
- [ ] 4.3 Code review, green CI, merge, install, `--check`; observe the next evening.
