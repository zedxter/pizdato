# Intent: publication profiles for the editorial gate

Issue: #226. Follows #222 (`editorial-recall`, released as da0b2ed).

## Problem

The editorial gate in `deploy/editorial/` checks a candidate text in several stages:

- a proofreader and an editor review the text in parallel;
- a verifier with host-enforced dismissal grounds filters false positives;
- an approval is bound to the exact payload;
- a repair and replacement budget limits retries;
- an evaluation harness measures the gate with sealed held-out sets.

The flow is generic, but the gate can only check @pizdato_net posts. The channel is written into it:

- **Rubrics.** `editor.md`, `proofreader.md`, `verifier.md` and `writer.md` name the channel and Uncle Misha. They also name the fixed lines «Пиздато:», «Хуёво:», «Мудрость дня:» and the morning emojis, plus the weekday categories and the brand vocabulary. That is about 20 lines.
- **`gate.mjs`.** It takes a `wisdom` argument and checks it against `recentWisdoms(history)`. It also hard-codes the two content types (`everyday-observation` and `source-based-post`), the `persona-opinion` and `verdict-contrast` grounds, and a comment about Uncle Misha. The `persistent-evening` policy name is fixed in the code as well.

The owner wants to reuse the gate for other posts and stories. Copying the gate would fork every future improvement, including #225.

## Outcome and scope

The gate becomes a core with **publication profiles**:

- **Core:** the review flow, the categories, the host rules, the approval and budget mechanics, the evaluation harness, and the Russian-language rubric templates.
- **Profile:** everything that belongs to one publication. @pizdato_net becomes the profile `pizdato-channel`.

Scope:
- `deploy/editorial/` (gate, rubrics, harness);
- the callers that construct the gate or read `writer.md`: evening agent, worker and network; morning agent.

Supported texts: Russian short-form posts, columns and short stories, non-fiction or fiction, up to 4096 characters (one Telegram message). First-person narration, invented scenes and register are profile choices, not core rules.

Out of scope:
- recall changes (#225);
- non-Russian publications;
- texts over 4096 characters;
- history loading, delivery and publication markers;
- providers, models, schedules, credentials, caps and deadlines.

## Acceptance criteria

1. **Channel equivalence (goldens).** For the `pizdato-channel` profile, the following are identical to release da0b2ed:
   - the composed editor, proofreader, verifier and writer-polish rubrics, by pinned sha256;
   - for ten golden cases captured from a da0b2ed worktree through its own API: every serialized request, the verdict, the record entries and the snapshot;
   - the `network.check` preflight requests.

   The goldens are compared as exact strings (see the design, decision 7).
2. **Existing tests.** Existing tests pass, changed only where they construct the gate or call `review`.
3. **Neutral profile.** A neutral test profile completes the flow. Its prompts, schemas and messages contain no banned channel term, and its composed rubrics pass a readability lint and are committed as snapshots.
4. **Example profile.** A structurally different example profile (a column or story with a persona, first-person narration, a `title` field and no verdict lines) completes the flow with fake requests.
5. **Fail-fast configuration.** An invalid profile fails with `EDITORIAL_CONFIG` at construction and in `--check`. In the evening worker it does not consume stories.
6. **Prose matches the enums.** Dismissal grounds, suggestion categories and content types named in the rubrics match the profile-dependent enums.
7. **Evaluation per profile.** Every profile has its own fixtures and release bar. The contamination guard reads composed rubrics. Reports record composed-rubric hashes, and for the channel these equal da0b2ed. A repository test refuses an unevaluated production profile.
8. **Documentation.** `docs/editorial-profiles.md` has these sections, and every slot is listed in its slot table:
   - slot table;
   - profile fields and the `unique()` contract;
   - caller formats;
   - policy and budget;
   - size limit;
   - fixture layout;
   - evaluation command and bar;
   - a worked example.
9. **Deployment.** `--check` composes and validates for both slots. One isolated evening dry run and one morning dry run succeed.

## Must-nots

- Never change a byte of what the channel sends to the model in this change.
- Never weaken a host rule for any profile. Categories, language dismissal grounds and the misattribution rules stay in the core.
- Never let a profile without a persona dismiss a claim as `persona-opinion`, or one without verdict lines as `verdict-contrast`.
- Never add a second production publication in this change. A profile ships only with its own fixtures and evaluation.

## Rollback

Requests are byte-identical, so a live difference means a bug. Trigger: an `EDITORIAL_CONFIG` error or any other composition failure in the live logs, `--check` failing, or a channel post failing review differently from before. Steps (no state migration is needed):
1. Take both `run.lock` flocks.
2. Atomically re-point both slot links to the paths in the installer backup's `previous.json`.
3. Confirm that each `manifest.json` reports da0b2ed.
4. Run `--check` for both slots.

## Decisions requiring owner sign-off

1. Keep and generalise the gate instead of simplifying it to a single rewrite pass. Decided by the owner on 2026-10-10.
2. Equivalence is proven by byte-identical requests and identical decisions on goldens, instead of a new LLM evaluation run. Approved by the owner with the spec on 2026-10-10: identical inputs to the same model and settings cannot change behaviour beyond sampling noise, which the existing runs already measure.
3. Supported scope is short-form texts up to 4096 characters; long-form stories are a follow-up. Decided by the owner on 2026-10-10.
