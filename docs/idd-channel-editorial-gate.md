# Intent: varied, readable scheduled channel posts

Issue: #205. Status: proposed; owner approval and five spec reviews are pending.

## Outcome
Morning wisdom and evening stories should reward reading: recognizable detail, a coherent observation, an earned joke, and natural Russian. Coffee and Uncle Misha's surprise must stop acting as default filler.

## Scope
The active OS runners in `deploy/morning/` and `deploy/evening/`, their prompts, installed post-polish resources, history input, and the host-controlled step before Telegram delivery. Morning remains wisdom plus wish without promotion; evening retains weekday categories, verified source cover and CTA. Schedules remain 10:00 and 18:00 Europe/Berlin.

## Acceptance
- Both jobs consult confirmed morning and evening publications from the preceding 14 local calendar days, including wishes and hooks.
- Generation does not use a beverage ritual or a stock surprise reaction as its default framing.
- A separate editor evaluates the exact final rendered message for Russian correctness, coherent meaning, relevance, and repetition before the host sends it.
- Failed, missing, malformed or stale review prevents sending. At most three candidates are reviewed per run; exhaustion saves a rejected draft locally and exits unsuccessfully.
- Test fixtures include the observed repeated opening, coffee wishes, nonsensical cooling/empty-cup wisdom, agreement errors, and valid colloquial humor.
- Deterministic Rust/Node orchestration tests and a documented live, non-publishing editorial evaluation precede rollout.

## Must not happen
No test messages, unreviewed fallbacks, fabricated news/comments/statistics, changes to credentials/destination, duplicate sends, or automatic activation of legacy/Hermes jobs. No detector score pretending to prove human authorship. No global rewrite of unrelated profiles' skills.

## Risks and decisions
Editorial judgment is probabilistic: a separate model call reduces self-approval but cannot guarantee perfect Russian. Use explicit dimensions, measured fixtures, bounded attempts and fail-closed orchestration. Keep the current provider/model initially and measure its editor performance before considering a model change. Freeze the candidate after approval. Full cross-slot history requires code, not just prompt wording.

## Approval boundary
This PR specifies the change and supplies proposed prompts only. AGENTS.md requires a spec PR reviewed by five reviewers before implementation and names Danil as the spec approver. Runtime code and installed files remain unchanged until that gate is satisfied.
