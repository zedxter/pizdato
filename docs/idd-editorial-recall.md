# Intent: catch misattributed quotes, wrong word meanings and unintended readings

Issue: #222. Follow-up of #219 (`editorial-convergence`), which launched below its release bar by owner decision (IDD decision 8 of `docs/idd-editorial-convergence.md`).

## Problem

On 0f8fdbe the launch configuration (Nous Portal, `openai/gpt-6.1-sol`, reasoning effort high) blocked no clean trial (21/21) but caught 47/54 objective-defect trials (87%) against the 90% bar (evidence in #221):

- `nasa-quote-attributed-to-misha` 0/3: the administrator's real words are put in Uncle Misha's mouth. The text is blocked as a staged scene with a neighbour (`ai-slop`), but the misattributed words are never quoted, so a repair can keep them.
- `stickney-wrong-phrase-wife` 0/3: «имя жене оставили» (a 2026-10-09 incident wisdom) says the wife received a name; neither reader flags it.
- `stickney-wrong-word-girth` 2/3: «девяти километров в обхвате» for a diameter.
- A caption approved in a dry run contained «Картошку и горошек попросила приготовить соседа», which also reads as "asked to cook the neighbour".
- Evaluation integrity: on d3afb86 a proofreader example had been copied from a fixture (removed in 7cc1602). Nothing prevents a repeat.
- Cosmetic: the morning and legacy evening preflights log "OpenRouter" even when the configured endpoint is Nous Portal.

## Outcome and scope

The gate names misattributed quotes, words used in a meaning they do not have and word order that produces an unintended reading, at the release bar and without blocking clean texts, measured on fixtures that did not shape the rubrics. Scope: proofreader, editor, verifier and writer-polish rubrics; evaluation fixtures, harness and a guard test; the preflight log lines. Out of scope: gate and worker code, convergence caps, the deadline, schedules, credentials, providers and models.

## Acceptance criteria

- At least three new held-out fixtures per class (misattributed quotes, words used in a meaning they do not have, unintended readings) and three new held-out clean fixtures, built from real dry-run articles and captions, label-checked by reviewers independent of the evaluated model and committed before any rubric change. They are not run until the final evaluation.
- Rubric rules are general and their examples come from no fixture; a test fails when a rubric or prompt contains a fixture's text or injected defect.
- A fresh three-trial run of all fixtures on the final head meets the release bar (no clean trial blocked, at least 90% of objective-defect trials caught with the defect named) with every miss listed; held-out fixtures are reported separately together with their result on the current release.
- Four isolated evening dry runs and one morning dry run still reach approval within the activation budget.
- Preflight log lines name the endpoint host they verified.

## Must-nots

Never copy fixture text into a rubric or tune on held-out fixtures. Never relabel a fixture after seeing its result without recording why. Never let the new rules block Uncle Misha's own opinions, jokes or common sayings, deliberate wordplay, or a sentence whose second reading is only theoretical. Never change blocker categories, convergence caps, the deadline, schedules, credentials or the model configuration.

## Decisions requiring owner sign-off

None beyond approving the release; calibration choices are recorded in the design.
