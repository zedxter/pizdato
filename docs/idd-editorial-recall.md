# Intent: catch misattributed quotes, wrong word meanings and second readings

Issue: #222. Follow-up of #219 (`editorial-convergence`), which launched below its release bar by owner decision (decision 8 in `docs/idd-editorial-convergence.md`).

## Problem

On 0f8fdbe the launch configuration (Nous Portal, `openai/gpt-6.1-sol`, reasoning effort high) blocked no clean trial (21/21) but caught only 47/54 objective-defect trials (87%) against the 90% bar (evidence in #221):

- `nasa-quote-attributed-to-misha` 0/3: the administrator's real words are put in Uncle Misha's mouth. The text is blocked as a staged scene (`ai-slop`), but the misattributed words are never quoted, so a repair can keep them.
- `stickney-wrong-phrase-wife` 0/3: «имя жене оставили», a wisdom from the 2026-10-09 incident; neither reader flags it.
- `stickney-wrong-word-girth` 2/3: «девяти километров в обхвате» for a diameter.
- A caption approved in a dry run contained «Картошку и горошек попросила приготовить соседа», which also reads as "asked to cook the neighbour". Another approved dry-run caption contained «к дню» (correct: «ко дню»), found by the label panel of this issue.

The evaluation is also partly contaminated. On d3afb86 a proofreader example had been copied from a fixture (removed in 7cc1602). The guard test of this issue found three more fixtures whose defect text is a rubric example: «меньше земной больше чем в тысячу раз» (`stickney-clashing-comparatives`) and «листал ленту за кофе» (`stickney-stock-coffee-opener-is-repairable`, `repeated-hook`). Their 9 passing trials inflated the 87%; without them it was 38/45 (84%). Reviewers found further restatements in English and as fixes (an empty mug that cannot prove the coffee went cold; a lottery win sold as a life hack; «пол-луны»).

Cosmetic: the morning and legacy evening preflights log "OpenRouter" even when the configured endpoint is Nous Portal.

## Outcome and scope

The gate names misattributed quotes, words used in a meaning they do not have and absurd second readings without blocking clean texts, Uncle Misha's voice or wordplay. The result is measured on fixtures that did not shape the rubrics.

Scope:
- a `misattribution` category with restricted dismissals in `gate.mjs`;
- proofreader, editor, verifier and writer-polish rubrics;
- evaluation fixtures, harness and guard test;
- the preflight log lines.

Out of scope: worker code, convergence caps, the deadline, schedules, credentials, providers and models.

## Acceptance criteria

- Rubric examples come from a published generic list. Incident phrases and restatements of fixtures leave the rubrics, and a test fails on literal overlap.
- A sealed held-out set meets all of the following:
  - it is written by an author other than the rubric author, from articles no other fixture uses;
  - each article gives a clean text, one variant per class and two clean near-misses;
  - labels are confirmed unanimously by three independent reviewers;
  - only its hash is published (repository and #222) before any gate or rubric change.
- On a fresh three-trial final run of the final head, made back to back with the release baseline:
  - the #219 set blocks no clean trial and catches at least 90% of its objective trials;
  - each motivating miss confirmed by the label panel is caught in at least 2/3 trials;
  - the held-out set blocks no clean or near-miss trial and catches at least 8/9 trials per class;
  - no class does worse than on the release.
- A blocker counts only when it quotes the injected span with an expected category. Every miss and every new-class blocker is listed with its reader.
- Four isolated evening dry runs are each approved within two activations without a story replacement, three morning dry runs succeed, and no new-class blocker in them is false.
- Preflight log lines name the endpoint host they verified.

## Must-nots

- Never copy fixture text into a rubric, and never show the held-out set to the rubric author before the final run.
- Never relabel a held-out fixture after a run.
- Never let the new rules block Uncle Misha's own remarks or his reactions to credited quotes, common sayings, deliberate wordplay, figurative or colloquial use, or readings the endings exclude.
- Never apply attribution findings to morning posts.
- Never change convergence caps, the deadline, schedules, credentials or the model configuration.

## Rollback

Trigger: the first live evening after deployment is still unapproved at 19:00 Berlin, or a false block on a quote, on Uncle Misha's line or on wordplay appears in the live logs. Rollback restores the previous release links from the installer backup (`previous.json`); rubrics are read on every review, so it takes effect on the next tick.

## Decisions requiring owner sign-off

1. The release bar of this change is stricter than #219's pooled 90%: separate bars for the #219 set, the motivating misses and each held-out class. If it is not met, the change is not deployed without a new owner decision.
2. Release below this change's bar (owner decision, 2026-10-10). The final run on d78abde met the #219, motivating-miss, misattribution and wrong-word bars but caught only 5/9 held-out second-reading trials and blocked held-out clean texts in 18/27 trials. All of those blocks came from two defects in the held-out base texts that the release also blocks; no new-class blocker fired on a near-miss. The owner accepted the release; #225 tracks the gap.
