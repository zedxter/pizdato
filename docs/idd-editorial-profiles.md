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

Out of scope:
- recall changes (#225);
- non-Russian publications;
- texts longer than one review request;
- history loading, delivery and publication markers;
- providers, models, schedules, credentials, caps and deadlines.

## Acceptance criteria

1. **Byte-identical channel requests.** For the `pizdato-channel` profile, every request the gate and the writers send is byte-identical to da0b2ed for the same input:
   - system prompts composed from the core templates and the profile;
   - user message JSON;
   - response schemas;
   - request titles and options.

   Tests pin the sha256 of each da0b2ed rubric file and compare recorded requests on representative inputs (morning, evening first review, revision, verifier).
2. **Identical channel decisions.** All existing gate, worker, morning and evaluation tests pass unchanged, except for the lines that construct the gate with a profile.
3. **No channel text in the core.** A neutral test profile (no persona, no fixed lines, no extra fields) composes rubrics and runs the full review flow. Its composed prompts, schemas and messages contain none of the channel terms:
   - pizdato, Пиздато, Хуёво;
   - Миша, Misha;
   - Мудрость, wisdom;
   - the weekday categories.
4. **Strict composition.** Composition fails loudly on:
   - a missing slot;
   - an unknown slot;
   - an unresolved `{{…}}`;
   - a profile without an id or language.
5. **Documentation.** `docs/editorial-profiles.md` explains how to add a publication and how to evaluate it with its own fixtures.
6. **Deployment.** One isolated evening dry run and one morning dry run succeed. `--check` passes for both slots.

## Must-nots

- Never change a byte of what the channel sends to the model in this change.
- Never weaken a host rule for any profile. Categories, language dismissal grounds and the misattribution rules stay in the core.
- Never let a profile without a persona dismiss a claim as `persona-opinion`, or one without verdict lines as `verdict-contrast`.
- Never add a second production publication in this change. A profile ships only with its own fixtures and evaluation.

## Rollback

Requests are byte-identical, so a live difference means a bug. Trigger: any channel post fails review in a way the logs attribute to composition, or `--check` fails. Rollback restores the previous release links from the installer backup (`previous.json`).

## Decisions requiring owner sign-off

1. Keep and generalise the gate instead of simplifying it to a single rewrite pass. Decided by the owner on 2026-10-10.
2. Equivalence is proven by byte-identical requests instead of a new LLM evaluation run. Recommended, because identical inputs to the same model and settings cannot change behaviour beyond sampling noise, which the existing runs already measure.
