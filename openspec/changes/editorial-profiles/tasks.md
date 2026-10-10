## 1. Specification

- [x] 1.1 Record intent in issue #226, docs/idd-editorial-profiles.md and this change.
- [ ] 1.2 Complete five independent spec reviews and record them in review.md; pass strict validation.
- [ ] 1.3 Obtain owner approval.

## 2. Golden requests first

- [ ] 2.1 Capture script and golden requests from da0b2ed (morning, evening first review, revision, verifier round), plus the da0b2ed rubric sha256 values.
- [ ] 2.2 Failing tests: byte-identical channel rubrics and requests, strict composition, neutral profile without channel terms, profile-dependent grounds, profile fields.

## 3. Implementation

- [ ] 3.1 `compose-rubric.mjs` and core templates with slots.
- [ ] 3.2 `profiles/pizdato-channel.mjs` and the neutral test profile.
- [ ] 3.3 `gate.mjs`: profile requirement, fields, profile-dependent grounds, content types, `persistent` policy.
- [ ] 3.4 Callers and evaluation harness pass the profile; the writer polish is composed.
- [ ] 3.5 `docs/editorial-profiles.md`.

## 4. QA and deployment

- [ ] 4.1 Full Node and Rust test suites; code review; green CI.
- [ ] 4.2 Merge, install, `--check` for both slots, one isolated evening and one morning dry run.
- [ ] 4.3 Observe the next live posts against the rollback trigger.
