## Why

The October 8 evening edition disappeared after discovery exhausted its turn budget, and the existing gate also stops after two repairs per story and three stories. Issue #214 requests continued work until the post passes independent review and is delivered; #209 documents unreliable discovery.

## What Changes

- Persist an evening edition, draft, evidence, every review finding and retry status across worker activations.
- Remove total evening repair/story ceilings; repair the same usable story until approved and replace only unusable or repeated stories.
- Bound work per activation and resume automatically, including discovery and transient service failures.
- Switch ineffective search to independent source feeds and verified reserve candidates, without bypassing review.
- Retain send reconciliation, exact-text approval and duplicate protection; expose overdue and ambiguous delivery states.
- Keep morning scheduling and editorial behavior unchanged; share only final publication locking and recovery to prevent history races.

## Capabilities

### New Capabilities
- `evening-delivery`: durable preparation, repeated full review, source fallback, retry scheduling and confirmed delivery. Supersedes evening-only exhaustion rules in unarchived channel-editorial-gate/editorial-revision changes; their other safeguards remain in effect.

### Modified Capabilities
None in canonical openspec/specs; the previous channel changes remain unarchived.

## Impact

Evening worker, shell runner, cron, shared gate with an explicit evening policy, installer, local state and operational documentation. No Rust backend API or frontend change. Tests include Node behavioral tests and Rust subprocess coverage. Specification first; implementation and deployment follow owner approval and five spec reviews.
