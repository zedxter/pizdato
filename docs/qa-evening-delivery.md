# Evening delivery QA — 2026-10-09

Issue #214; specification PR #216 approved by the owner in conversation and merged after all seven checks passed. The owner subsequently approved immutable cover storage on pizdato.net to accommodate the live Composio photo schema.

## Test-first evidence

Rust process-boundary test initially failed because the gate had no persistent snapshot. The durable-worker Rust test then failed because the worker/store did not exist. New focused regressions demonstrated invalid drafts stuck in review, corrupt markers falsely closing editions, ignored legacy send intents, missing corrupt-state status, permanent source 404 retry loops, incorrect ambiguous-send classification before network dispatch, incomplete tool conversations, and null-body response failures before their fixes.

Final core run: 98 Node tests, 14 evening Rust tests and 10 morning Rust tests passed. An additional focused discovery test confirms exactly three ineffective searches followed by a feed-derived draft. The thirteen-process Rust fixture performs twelve repairs across distinct processes and sends exactly once. Other cases cover restart receipt recovery, midnight/DST, fair scheduling, invalid editor output, Retry-After, shared locking, reconciliation mismatch, immutable cover bytes, chmod recovery and installer preservation of the morning cron entry. Strict OpenSpec validation and shell syntax checks passed.

## Independent code review

Two independent agents reviewed changes against standards and the approved specification. Findings were fixed with focused regression coverage: permanent evidence failure routing, pre-dispatch yields, public-copy permission recovery, incomplete writer tool transcripts and HTTP no-content response handling. Both reviewers report no remaining blockers (standards at 085df7c; spec including the follow-up at 799a041). These are agent reviews, not impersonated approvals from named team members.

## Real dependency checks without publication

The named Composio channel identity and OpenRouter model check passed (`PREFLIGHT_OK`). A private dry-run state at `/tmp/pizdato-evening-dry-aEB2Sq` retained a NASA source and its draft through failed attempts. The editor then rejected two specific factual/causal claims. A subsequent activation repaired the same source, received all five passing dimensions and saved a 911-character approved caption (`DRY_RUN_OK`). No Telegram send was performed. This is a gate/repair test, not a claim that model judgment proves perfect factual accuracy.

NASA, ESA and ScienceDaily feed endpoints returned HTTP 200. Original cover validation yielded a stable content hash. Live cover hosting, installed-release checks and the first scheduled edition are recorded separately after deployment; none is implied by a source-tree dry run.

Final writer regressions first failed for lost editorial findings and reasoning-enabled structured drafting. Both now pass: malformed JSON retains all existing findings, and the structured writer disables optional reasoning while the independent editor retains all five review dimensions and the strict verdict schema. The final follow-up specification review found no blockers.

Two real review resumptions exceeded the original 60-second model deadline while preserving the draft. The model deadline was tuned to 180 seconds, still clipped to the five-minute activation limit; ordinary network requests remain limited to 15 seconds. This deployment tuning is reflected in the design.

A reviewer identified excess review capacity being reserved again after a successful slow review. The immutable-media test first failed with 75 seconds remaining; final delivery now reserves two external operations and 60 seconds, while preparation retains the full review reserve. The test then passed with the same verified media and exactly one send.

The live editor also exhausted its optional reasoning allocation and returned null content. A failing adapter test established the required evening-only request behavior; disabling optional reasoning for the evening reviewer fixes output allocation without changing the complete independent rubric, verdict schema, temperature or gate validation. Morning model configuration is unchanged.

Repeated live repairs exposed generic length findings that did not help the writer converge. Failing validator tests now require measured caption/word counts and concrete revision targets; the writer aims below the hard caption ceiling. The hard validation limits are unchanged.

Final real recovery proof at 2026-10-09 10:08 UTC: the same NASA draft passed the full gate after multiple process resumptions, factual/voice repairs and structural corrections (`DRY_RUN_OK`). Writer context now omits duplicated primary evidence and obsolete raw text while retaining confirmed history, supporting evidence and all latest findings beside the final repair instruction. No public message was sent.
