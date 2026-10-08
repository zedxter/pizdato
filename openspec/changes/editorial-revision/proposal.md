## Why

Every rejection currently discards the story, including a correctable pronoun error. Repair verified copy first to avoid unnecessary discovery and lost posts. Owner approved this behavior in the conversation; issue #210 and docs/idd-editorial-revision.md capture the intent.

## What Changes

- Separate repair from replacement in strict editor verdicts.
- Give each of at most three stories an initial submission and two fully reviewed repairs.
- Immediately replace recent repeats and unusable sources; count structural failures within the same bounded submission policy.
- Preserve approval binding, run deadlines, source validation and transport safeguards.

## Capabilities

### New Capabilities
- `channel-editorial-revision`: repair-first state transitions and complete re-review. This supersedes the bounded revision/replacement rules in the unarchived channel-editorial-gate change; its other requirements remain unchanged.

### Modified Capabilities
None in the canonical openspec/specs tree; channel-editorial-quality exists only in the prior unarchived change.

## Impact

Shared deploy/editorial gate, both Node writers and versioned prompts, tests and deployment documentation. No Rust service, React UI, schedule, credential or search-provider change. Rust runner tests exercise the unchanged process boundary.
