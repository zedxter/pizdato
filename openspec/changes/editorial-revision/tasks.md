## 1. Specification

- [x] 1.1 Record the approved repair-first intent, scope and behavior in issue #210, IDD and OpenSpec.
- [ ] 1.2 Complete five independent spec reviews and merge the spec PR after CI.

## 2. TDD implementation

- [ ] 2.1 Prove repair, replacement, terminal limits and full re-review at the shared gate seam, then implement host-owned state.
- [ ] 2.2 Prove same-subject morning repair and structural-failure limits through the host, then integrate feedback.
- [ ] 2.3 Prove same-source evening repair, retired-source protection and separate research/revision limits through host/Rust subprocess tests, then integrate.
- [ ] 2.4 Update strict editor/writer instructions, routing fixtures and deployment documentation to match the specification.

## 3. QA and deployment

- [ ] 3.1 Pass focused and regression tests, real-model routing probes and non-publishing dry-runs; record actual limitations.
- [ ] 3.2 Review and merge the implementation PR after green CI.
- [ ] 3.3 Install under both runner locks, verify hashes and unchanged schedules, and record installed check results and rollback location.
