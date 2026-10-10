## 1. Specification

- [x] 1.1 Record intent in issue #226, docs/idd-editorial-profiles.md and this change.
- [x] 1.2 Complete five independent spec reviews and record them in review.md; pass strict validation.
- [x] 1.3 Obtain owner approval (2026-10-10).

## 2. Goldens first

- [x] 2.1 `capture-goldens.mjs` with its provenance checks; capture the ten golden cases from a da0b2ed worktree; pin the four rubric sha256 values.
- [x] 2.2 Failing tests (scenario → file):
  - byte-identical rubrics, writer polish, requests, decisions and preflight, plus capture provenance → `test/golden.test.mjs`;
  - strict composition, missing/unused/leftover slots, id and language, prose–enum agreement → `test/compose-rubric.test.mjs`;
  - neutral profile (terms, lint, snapshots), example column profile, profile-dependent enums and option identity, fields and length → `test/profiles.test.mjs`;
  - configuration errors in the worker and morning → `test/delivery.test.mjs` and the morning tests;
  - `--check` on a broken profile → `deploy/evening/test/runner.rs` and the morning tests;
  - evaluation per profile, contamination in slots, provenance, production rule → `test/eval-summary.test.mjs`, `test/fixture-guard.test.mjs`;
  - installer ships the profile and composer, not the test profiles → `test/install.test.mjs`.

## 3. Implementation

- [x] 3.1 `compose-rubric.mjs`, `*.template.md` and `validateProfile`.
- [x] 3.2 `profiles/pizdato-channel.mjs`; the test profiles `neutral` and `example-column`.
- [x] 3.3 `gate.mjs`: profile requirement, `reviewOptions`, fields, length, profile-dependent enums, generic no-evidence comment.
- [x] 3.4 Callers: profile, composed polish, profile options in `network.check`, configuration-error handling, `--check` composition.
- [x] 3.5 Harness: `--profile`, per-profile fixtures and bar, composed-rubric contamination and provenance.
- [x] 3.6 `docs/editorial-profiles.md` with these sections:
  - slot table;
  - profile fields and the `unique()` contract;
  - the caller-supplied history, hostText and source formats;
  - policy and budget semantics;
  - size limit;
  - fixture schema and layout;
  - evaluation command and release bar;
  - a worked minimal profile.

## 4. QA and deployment

- [ ] 4.1 Full Node and Rust suites; code review; green CI.
- [ ] 4.2 Merge, install, `--check` for both slots, one isolated evening and one morning dry run.
- [ ] 4.3 Observe the next live posts against the rollback trigger.
