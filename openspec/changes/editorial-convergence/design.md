## Context

See proposal.md and docs/idd-editorial-convergence.md. Production c33c3fc: evening worker with unlimited repairs (`persistent-evening`), deterministic `validateDraft`, one LLM editor (DeepSeek v4.1 flash, temperature 0, reasoning off) receiving `rejectedCandidates`, writer rewriting the full caption, five-minute cron tick. The morning slot shares the gate with a bounded policy.

## Goals / Non-Goals

Goals: objective quality checks that converge; publication the same evening; visible end of an unpublishable evening; no taste-driven blocking; configurable model provider. Non-goals: discovery sources (#209), Sunday site statistics, changing transport, reconciliation, history or schedules.

## Decisions

### Verdict contract
Reviewers return `{"issues":[{category,quote,problem,fix}]}` under strict JSON schemas; no model-supplied decision or booleans. The host derives the decision: any blocker → revise; a repetition or unusable-source blocker → replace; otherwise approve. The five legacy dimension booleans are derived from blocker categories for records and status. Unknown keys or categories fail closed; one immediate retry absorbs an empty or malformed answer (providers occasionally return no content).

### Three reviewers
1. Proofreader: candidate text only, language categories only. A narrow request avoids language errors being lost in 25k tokens of history and sources.
2. Editor: candidate, wisdom pointer, confirmed history, evidence, current story/revision, changed sections, abandoned story texts. No earlier findings or drafts of the current story (anchoring cut approvals from 9/15 to 2/15 in a controlled replay).
3. Verifier: candidate, evidence, history and the numbered claimed blockers; returns `real`, a corrected blocker `category`, a `ground` and a reason per claim. Open-ended critics over-report, while a yes/no check of a specific claim is more reliable. Only an explicit dismissal clears a claim, and a language claim (spelling, grammar, punctuation, wrong phrase) only on the grounds `correct-as-written` or `misread`. A category correction may downgrade a replacement to a repair but never escalate a repair into a replacement. Duplicate ids fail closed. Host-deterministic findings skip verification. Each reviewer request is retried once on a transport error or an empty/malformed answer (the retry adds an explicit correction); a budget yield is never retried.
Reasoning stays disabled for DeepSeek requests: with OpenRouter DeepSeek, effort "low" occasionally consumed the whole 12k-token budget and returned no content. OpenAI reasoning models receive a configured effort (`PIZDATO_REASONING_EFFORT` for writing, `PIZDATO_EDITOR_REASONING_EFFORT` for reviewers, default low), which they respect; at `high` a full review with real history took at most 36 s.

### Host-owned sections
The writer returns `angle, hook, body[], pizdato, huevo, huevo_first, wisdom_options[], wisdom, source_url, image_url, supporting_urls`. `compose.mjs` normalizes labels and quotes, renders the fixed layout (verdict order flip allowed) and the CTA, measures characters, UTF-16 units and words, picks the first fitting unflagged brainstormed wisdom, derives the weekday category, and lints: stock phrases from the 2026-09/10 archive audit, recurring language errors, first-person narration, links, emoji count, persona presence (any case) and over-use. Findings carry section, quote and exact numbers. The legacy `run.sh`/`agent.mjs` path keeps `validateDraft`.

### Repairs and convergence
`sectionsFor` maps findings to sections by quote on word boundaries; unlocated findings unlock all sections; a length finding unlocks hook and story. `merge` keeps locked sections byte-identical and takes the writer's current source-owned cover. A caption identical to one that received verified blockers never reaches a review again; a quoted defect still present verbatim (punctuation, case and ё significant) returns to the writer once per round, because quotes can be wider than the fixed error and the blocked sections are re-reviewed in full: the next review names changed sections plus the previously blocked ones, and an unchanged re-review (e.g. after a history change) is a full review. Wisdoms are flagged only for blockers located in the wisdom alone. Up to three drafts per activation fix mechanical findings before a review. Suggestions (except category fit) accompany only the first repair of a story; an approved first draft is published as is. The gate replaces a story after four repairs; the worker replaces it after nine failed mechanical checks (three activations), three consecutive source-verification failures or three consecutive review failures. Unusable supporting evidence becomes a repair finding. Repairs and replacements continue on the next tick without backoff. Replacement clears evidence, raw draft, media, blockers, suggestions, flagged wisdoms and the search allowance. Abandoned or published sources are rejected by discovery and by the worker. Validation records carry story, revision, mechanical count and unlocked sections.

### Scheduling
`deadlineAt(day)` = due time + 5 hours (23:00 Berlin, DST-aware via `dueAt`). Before selecting work, unpublished open editions past the deadline become `cancelled` with `cancellation.automatic` and an expiry record, and the CLI prints `EXPIRED <day>`. Inside the publication lock the deadline is checked again with the activation clock before the send intent is written. Dry runs skip expiry. Selection accepts editions due within the next 60 seconds. Status shows deadline, story and cancellation. The worker accepts both publication-marker grammars that confirmed history accepts. A repeated blocked check keeps the original resume phase.

### Provider
`llmConfig()` reads an HTTPS `PIZDATO_LLM_BASE_URL` (default OpenRouter) and binds keys to hosts: `PIZDATO_LLM_API_KEY` for any host, otherwise `OPENROUTER_API_KEY` only for openrouter.ai and `NOUS_API_KEY` only for nousresearch.com; without a matching key no request is sent. One endpoint serves every role and both slots, so `PIZDATO_EVENING_MODEL` (and `PIZDATO_MORNING_MODEL` when set) must be served by it. `PIZDATO_LLM_DIALECT` optionally overrides dialect detection. OpenRouter dialect keeps `reasoning`, `max_tokens` and `provider.require_parameters`; the OpenAI dialect sends only standard fields (`reasoning_effort`, `max_completion_tokens`). Temperature is omitted for OpenAI reasoning models (OpenRouter returns 404 "No endpoints found" for `openai/gpt-6.1-sol` with temperature plus require_parameters). `PIZDATO_EDITOR_MODEL` selects the reviewer model. `--check` proves plain and strict-JSON replies from the writer, reviewer and (when set) morning models, the real editor and verifier schemas from the reviewer model, and a tool call from the writer model. Composio Telegram calls get a 90-second deadline instead of 15 seconds; delivery reserves 120 seconds and a send starts only with at least 90 seconds left. Discovery searches Bing News RSS (the web RSS returned dictionaries and wikis from this host) and receives titles, summaries and original article URLs unwrapped from Bing redirects.

### Alternatives considered
- Relax thresholds only: still non-convergent, and the judge also misses real defects.
- Keep unlimited repairs: proven deadlock.
- Editor rewrites text itself: changed text still needs independent review.
- Majority vote of several editors: costlier and needs fuzzy matching; the verifier targets the same false positives with one request.
- Durable approval across activations: conflicts with fresh-history review; not needed when reviews converge.

## Risks / Trade-offs

- Verifier false negatives could dismiss a real defect → explicit real-defect list in its rubric, deterministic lint for recurring errors, proofreader, fixtures with real defects in the evaluation.
- More model calls per review (three instead of one) → short proofreader input; verification only when blockers exist; bounded by activation budget.
- A deadline may skip an evening during long outages → visible cancellation; next evening unaffected.
- DeepSeek remains a weak judge; a stronger model (e.g. gpt-6.1-sol via Nous Portal) is a configuration switch gated by preflight, evaluation and dry runs.

## Rollback

Reinstall the previous release with `deploy/editorial/install.py` from the earlier revision or restore links from the install backup's `previous.json` under both slot locks. Journals written by this version keep their fields; the previous worker ignores unknown fields. Remove `PIZDATO_LLM_*`/`PIZDATO_EDITOR_MODEL` settings to return to OpenRouter DeepSeek.

## Migration Plan

Spec review and owner approval, implementation PR with tests and evaluation evidence, CI, merge, installer without `--schedule` (cron already runs the tick), `--status` and `--check`, then observe the next scheduled evening. The stuck 2026-10-09 edition expires on the first tick.
