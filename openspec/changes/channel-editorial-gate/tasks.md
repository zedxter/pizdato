## 1. Specification and review
- [x] 1.1 Audit active schedules, installed prompts, history and publication checks; reproduce validator acceptance.
- [x] 1.2 Write IDD, proposal, behavior scenarios, design and concrete prompt drafts for #205.
- [ ] 1.3 Obtain five spec reviews and Danil's approval before implementation.

## 2. Failing tests first
- [ ] 2.1 Add Rust runner and Node host-seam tests proving failed/missing review never sends.
- [ ] 2.2 Add cross-slot full-history, confirmation, window and I/O failure scenarios.
- [ ] 2.3 Add mutation, malformed verdict, editor timeout and three-round exhaustion scenarios.
- [ ] 2.4 Add labeled Russian grammar/meaning/repetition fixtures and acceptable idiomatic controls; observe failures before fixing.

## 3. Implementation
- [ ] 3.1 Implement shared confirmed history and generation instructions for freshness.
- [ ] 3.2 Implement separate editor request, strict verdict validation and host-bound text approval.
- [ ] 3.3 Integrate both send paths with bounded revision and local rejection records.
- [ ] 3.4 Version and install coherent shared resources; preserve transport and slot contracts.

## 4. QA and rollout
- [ ] 4.1 Pass existing and new Node/Rust tests and CI in an implementation PR.
- [ ] 4.2 Run three non-publishing trials per linguistic fixture; record model/settings/verdicts and investigate every mismatch.
- [ ] 4.3 Run both real dry-runs and inspect exact final drafts and editorial verdicts.
- [ ] 4.4 After required review, CI and merge, back up and install under runner locks; verify hashes and unchanged schedules.
- [ ] 4.5 Verify next scheduled receipts and review the first week's variety; record limitations and rollback procedure.
