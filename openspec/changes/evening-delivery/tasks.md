## 1. Specification approval

- [x] 1.1 Create issue #214, IDD and consistent OpenSpec artifacts; relate discovery issue #209.
- [x] 1.2 Complete five independent specification reviews, resolve findings, pass validation/CI and obtain owner approval before implementation.

## 2. Durable preparation through TDD

- [x] 2.1 At existing gate and real-worker subprocess seams, prove more than ten repairs across restart and unchanged morning behavior with failing tests; implement explicit evening policy.
- [x] 2.2 Prove journal crash recovery, schema rejection and preservation of draft/evidence/findings; implement durable checkpoints and approval invalidation.
- [x] 2.3 Prove model and external-operation budget/time-limit yields, malformed-review recovery and transient-service backoff; implement bounded activations with ongoing retries.
- [x] 2.4 Prove irrelevant-search fallback, source/category/history filtering and no unchecked reserve publication; implement feeds/reserve discovery and verify/document shipped feed endpoints.

## 3. Delivery and operations through TDD

- [x] 3.1 Prove intent-before-send, confirmed-ID recovery, ambiguous-send block and payload/channel-bound explicit reconciliation with Node and Rust subprocess tests; implement durable delivery finalization, confirmed-history recovery and shared final publication locking without changing morning editorial policy.
- [x] 3.2 Prove due-date enqueue, missed dates, midnight/DST, fair backlog scheduling, blocked-edition exclusion and lock serialization; implement five-minute evening tick and installer migration.
- [x] 3.3 Prove fresh history/evidence review after resume and delayed language correction; preserve edition identity separately from send timestamp.
- [x] 3.4 Prove offline status, overdue indicators, redacted logs and isolated dry-run behavior; document retries, reconciliation, cancellation and rollback.

## 4. QA and deployment

- [x] 4.1 Run focused Node/Rust process tests and unchanged morning regression checks; validate multi-activation recovery without real public sends.
- [ ] 4.2 Run finite non-publishing checks against installed dependencies and verify independent source feeds; record evidence and unresolved limitations.
- [ ] 4.3 Complete implementation PR review and green CI, merge through PR, install under locks and verify manifest/cron/state/rollback backup.
- [ ] 4.4 Observe the first real scheduled edition through confirmed delivery or explicitly documented external blockage; never call a dry run a publication.
