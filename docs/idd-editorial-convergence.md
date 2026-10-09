# Intent: evening posts that pass real checks and actually publish

Issue: #219. Supersedes the unlimited-repair rule of #214/#215 and conflicting editorial rules of #207/#210.

## Problem

Owner report, 2026-10-09: after several quality gates were added, evening posts stopped arriving. The goal remains a maximally interesting post that reads like a real person wrote it, with no AI slop, no grammar errors and no wrong turns of phrase.

Evidence from the 2026-10-09 edition (18:00–23:35 Berlin, release c33c3fc): 41 submissions, 0 approvals, unbounded repair loop.

- 26 deterministic rejections: 13 captions of 954–1005 characters (Telegram allows 1024), 7 wisdoms of 7–9 words, 3 captions without the literal nominative «дядя Миша», 1 false word-count report caused by a trailing full stop, and 6 byte-identical resubmissions of one rejected caption.
- 15 LLM-editor rejections, 13 of them with a near-identical «вывод круговой» (circular wisdom) template.
- Two independent expert reviews found no publishable candidate, yet about half of the editor's complaints were taste or false, while it missed real defects: a recycled stock opener 13 times, «поллуны», «меньше земной больше чем в тысячу раз», a factual error.
- A controlled replay (52 model calls) showed anchoring: passing the editor its own earlier rejections cut approvals from 9/15 to 2/15 and raised the circular complaint from 7% to 73%; 9 runs reproduced the production text byte for byte.
- Production disabled editor reasoning while the release evaluation ran with it; with reasoning on, providers sometimes spend the whole token budget and return no content.
- The writer saw only the latest finding (validation overwrote editorial findings), never earlier rejected wisdoms, and rewrote the whole caption every round, creating new defects.
- Routine retries used exactly the cron period, so 28 of 69 ticks were idle; an older edition stayed runnable after midnight and would have competed with the next day.

## Outcome and scope

A scheduled evening post that passes objective checks is published the same evening; taste never blocks it; an evening that cannot produce one ends visibly at 23:00 Berlin. Scope: evening writer, deterministic host checks, shared editorial gate (morning included), worker scheduling, model provider configuration, prompts, evaluation fixtures, tests and operations documentation. Discovery sources (#209) are out of scope.

## Acceptance criteria

- Objective defects (spelling, grammar, punctuation, wrong phrase, meaning, unsupported claim, unusable source, repetition, AI slop) block; taste suggestions (humor, wisdom, style, category fit) never block and get one polishing pass per story.
- Every model-claimed blocker is confirmed by an independent verifier; dismissed claims do not block. A dedicated proofreader sees only the text.
- The editor never receives earlier drafts or findings of the current story; repairs are reviewed with the changed sections named.
- The host renders the caption from sections, measures length and word counts, chooses a fitting brainstormed wisdom and lints known stock phrases and recurring errors before any model review.
- A repair may change only flagged sections; echoes and unfixed quoted defects return to the writer before another review.
- A story gets at most four editorial repairs and three activations of failed mechanical repairs, then it is replaced.
- Editions expire automatically at 23:00 Berlin when unapproved; uncertain or confirmed deliveries are never expired; dry runs ignore the deadline.
- Routine retries run on the next five-minute tick.
- The model endpoint is configurable (OpenRouter by default, OpenAI-compatible endpoints such as Nous Portal), with a read-only preflight proving plain replies, strict JSON and tool calls.
- Exact-payload approval, durable journal, delivery reconciliation and shared publication locking stay unchanged.

## Must-nots

Never publish a payload with an outstanding verified blocker or without approval of that exact payload. Never send after an edition's deadline or on the next day. Never let taste remarks block, or a known objective defect pass. Never change schedules, credentials or transport safeguards silently. Never treat a dry run as delivery.

## Decisions requiring owner sign-off

1. Wisdom word floor 10 → 6 (19 of 35 published evening wisdoms, including the best, have fewer than 10 words; padding produced slop). The 15-word ceiling stays.
2. The 950-character caption limit stays. Evidence against it: 13 of 26 deterministic rejections on 2026-10-09 were 954–1005 characters and 8 of 31 archived evening posts exceed 950. It stays because the host now measures and tells the writer the exact cut, and every gpt-6.1-sol dry run landed at 796–862 characters on its first draft.
3. The weekday category guides story choice and is a suggestion, not a blocker; wording that bends a story to fit the category is a blocking distortion. Sunday "weekly site results" cannot be sourced by the pipeline (no site statistics source), so Sunday falls back to the best human story of the week until a site-results source exists (follow-up).
4. A 23:00 Berlin deadline replaces indefinite recovery of missed editions; the cron log prints `EXPIRED <day>`.
5. A four-repair story cap replaces unlimited repairs; convergence comes from verified blockers, not from count-free persistence.
6. Suggestions travel only with a repair; an approved first draft is published without a separate polishing round (faster delivery, no risk to an approved post).
7. Launch configuration: Nous Portal (`PIZDATO_LLM_BASE_URL=https://inference-api.nousresearch.com/v1`, `NOUS_API_KEY`) with `openai/gpt-6.1-sol` for every role and both slots, reasoning effort `high` for writers and reviewers. DeepSeek via OpenRouter remains the rollback configuration; it does not meet the release bar (it approves the misattributed-name factual error 3/3).
