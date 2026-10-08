## Context

See proposal.md. The shared gate currently accepts approve/revise and allows three calls; both hosts interpret every revise as replacement. Existing exact-payload approval uses a host-owned WeakMap.

## Goals / Non-Goals

Goals: one shared state machine for both hosts, no writer-controlled counters, clear distinction between earlier revisions and abandoned subjects. Non-goals: search fallback, model/provider changes, Rust backend or React frontend changes.

## Decisions

Extend decision to approve/revise/replace, keeping the five full-rubric booleans and issues. Revise means repairable; replace requires failed freshness or grounding. Any failed freshness dimension is forced to replacement by the host. Unsupported removable detail is revise/grounding=false; fundamentally unsupported story is replace/grounding=false. Contradictory verdicts remain fatal.

The shared gate owns state: subject 1..3, revision 0..2, terminal status and next action. The total submission maximum is nine. Each editorial rejection or host structural rejection advances the same budget: revise permits two repairs, then advances subject; replace advances subject immediately. Approval and exhaustion are terminal. A structural-rejection entry point consumes an opportunity without calling the editor and records validation findings. Review exceptions end the run.

The evening host pins the first usable fetched primary source during repair and retires a source when replacement is required. Existing fetched evidence and cover validation remain usable for repairs; replacement requires a different story/source with its own cover. Research budget resets only for an authorized new subject, never a repair. Invalid complete_post submissions also count. Missing, malformed or unfetched source URLs consume an attempt without pinning that unusable value; once pinned, a source substitution consumes an attempt without resetting the subject or discovery budget. Morning structural validation uses the same counters; exact recent repeats are classified as replacement.

Editor context labels current subject/revision and earlier drafts; same-subject revision is explicitly permitted, abandoned subjects cannot be cosmetically reintroduced, and full confirmed history remains authoritative. Writer feedback carries all issues plus a clear repair/replace instruction. Every revised payload receives a fresh independent review with unchanged thresholds.

Local records include sequential submission, subject, revision, kind (editorial/validation), exact text hash, verdict/findings and next action. Preserve existing timestamped per-run filenames. Tests use existing agreed public gate and real host subprocess seams, plus Rust runner subprocess coverage.

Alternative: merely raise the old three-call ceiling. Rejected because it would still discard good stories and conflate revisions with new subjects. Alternative: editor silently rewrites and approves its own output. Rejected because every changed text needs a fresh full review.

## Risks / Trade-offs

- Misclassified unsupported evidence -> explicit positive/negative routing fixtures, strict verdict checks and unchanged host evidence validation.
- More model work -> maximum nine submissions and existing 20-minute deadline, no unlimited loop.
- Accidental semantic reset -> host pins evening primary source and editor sees subject-labeled earlier drafts.
- Search remains unreliable -> preserve and disclose #209; do not claim revision repairs discovery.

## Migration Plan

Five spec reviews and passing spec CI, then TDD implementation PR, QA and green CI, merge, coherent two-slot installation using existing installer under both locks. Run exact installed dry-runs/checks without public test sends. Verify manifest hashes and unchanged schedules; record failures honestly. Roll back both links to the installer backup under both runner locks. Owner has approved implementing this flow in the conversation.
