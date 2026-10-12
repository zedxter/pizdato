## Context

See idd.md. Two independent code paths call models:

1. `deploy/channel` (copied to `/opt/pizdato/channel`, hourly cron in `/etc/cron.d/pizdato-channel`): `lib/generate.js` → `lib/openrouter.js`, hardcoded OpenRouter endpoint, `OPENROUTER_API_KEY`, default `deepseek/deepseek-v3.2`. It loads only `~/.config/pizdato-channel.env`.
2. `deploy/evening/agent.mjs` `llmConfig()`/`chat()`, shared by evening, morning (copied as `transport.mjs`) and `deploy/editorial/eval.mjs`. Default endpoint OpenRouter with an `openrouter` dialect (`reasoning` object, `max_tokens`, `provider.require_parameters`, `HTTP-Referer`/`X-Title`). Production overrides it with `PIZDATO_LLM_BASE_URL` (Nous Portal) and `NOUS_API_KEY`, so the live path already uses the `openai` dialect: `reasoning_effort` by title, `max_completion_tokens`, no temperature for gpt-6.1-sol, and `options.reasoning` ignored. Loaders are first-wins and read `pizdato-channel.env` before `pizdato-evening.env`.

## Goals / Non-Goals

**Goals:** Nous Portal as the only provider; no OpenRouter request is possible from repository code; unchanged prompts, validation, fallbacks, editorial decisions and schedules.

**Non-Goals:** Per-role model changes, rubric or gate changes, ingestion changes. Other OpenAI-compatible hosts stay possible on purpose via `PIZDATO_LLM_BASE_URL` + `PIZDATO_LLM_API_KEY` in the agent (the owner disabled OpenRouter, not every alternative); the channel package has no endpoint override.

## Decisions

1. **Channel adapter.** Replace `lib/openrouter.js` with `lib/nous.js` exporting `nousText({system, prompt, temperature})`. Fixed endpoint `https://inference-api.nousresearch.com/v1/chat/completions`, `NOUS_API_KEY`, model `PIZDATO_NEWS_MODEL` (trimmed, non-blank) or `openai/gpt-6.1-sol`. A new variable is used deliberately so the deployed `PIZDATO_LLM_MODEL=deepseek/deepseek-v3.2` cannot carry over. Reasoning models get a fixed `reasoning_effort: "low"` and no temperature; other models get the caller's temperature. `max_completion_tokens: 4096` (Nous accepts it for non-OpenAI models too, checked live with `mistralai/mistral-large-4-0`). Deadline handling (`PIZDATO_LLM_TIMEOUT_MS`, default 60 s), truncation/empty/API-error checks and safe error categories stay; messages say "Nous". The reasoning-model rule is a copy of the agent's regex because `/opt/pizdato/channel` is deployed standalone; both copies get the same table test. Nothing monitors the old "OpenRouter" log strings (checked: no grep/alerting in the repo or crontabs).
2. **Agent transport.** `llmConfig()` defaults to `https://inference-api.nousresearch.com/v1`, requires HTTPS, and throws if the hostname (trailing dot stripped) is `openrouter.ai` or ends with `.openrouter.ai`. Key: `PIZDATO_LLM_API_KEY`, else `NOUS_API_KEY` for `(^|\.)nousresearch\.com$`. `dialect` and `PIZDATO_LLM_DIALECT` are removed. `chat()` always sends the OpenAI-compatible shape, keeps `options.title` for `effortFor` routing, and ignores `options.reasoning`. Default model `openai/gpt-6.1-sol` in `chat()`, `morning/agent.mjs` and `eval.mjs`; `eval.mjs` no longer writes `dialect` into reports (historical `eval-runs/*.json` stay). `gate.mjs` keeps its options unchanged (the gate goldens pin them); only its stale comment is reworded.
   - Alternative considered: keep OpenRouter as an optional dialect. Rejected: the owner disabled it, and a dead branch keeps the key in deployments.
3. **Goldens.** `goldens/channel.json` remains the untouched da0b2ed record; no re-capture (the capture tool only runs on a da0b2ed worktree). Gate cases compare `chat()`-level messages/options, which do not change. The preflight test compares requests through a provider-neutral projection: same count and order; equal model, messages, temperature, response_format, tools and tool_choice; `max_completion_tokens` equal to the golden `max_tokens`; plus Nous URL and no OpenRouter-only fields/headers. Since `X-Title` disappears, `runPreflight` keys requests by sequence; the golden keys are matched by index. Every deploy/ file this change touches is added to `OWN` in `capture-goldens.mjs`, as its comment prescribes, so the provenance test keeps proving that the gate baseline still describes main.
4. **Harness invariants.** The fakes (`fake-network.mjs`, `system-trace.mjs`, `delivery-network.test.mjs`, `golden-cases.mjs`, `hosts`/`install`/morning tests, both `runner.rs`) match the Nous host and use `NOUS_API_KEY`, and throw on any other model host, so nothing reaches the network. The OpenRouter-specific "reviewers spend no tokens on optional reasoning" assertion (`reasoning.enabled === false`) is redefined as the live behavior: no `reasoning` field; non-reasoning models get no `reasoning_effort`; reasoning models get the title-routed effort. `system-trace.mjs` identifies reviewer requests by their system-prompt headings instead of `X-Title`. A failing "no request URL contains openrouter.ai" assertion is written first.
5. **Credentials.** `NOUS_API_KEY` moves to `~/.config/pizdato-channel.env` (loaded by every runtime) and replaces `OPENROUTER_API_KEY` there; `pizdato-evening.env` keeps model and effort settings only. Env edits are atomic (0600 temp file + rename), avoid minutes :04–:06, and never print values; live checks read the key from the env file, not argv.
6. **Docs.** README, env examples, `docs/evening-delivery.md`, `docs/evening-system-cron.md`, `docs/morning-system-cron.md` and `docs/channel-editorial-gate.md` operator sections. IDD/QA history files and archived changes stay as records.

## Risks / Trade-offs

- Nous outage → hourly heuristic fallback; evening repair loop/morning retry, as today.
- Reasoning latency → ~6 s measured for a verdict at `low`; deadline stays 60 s.
- Verdict wording drift → expected; recorded by the pre-deployment comparison.
- `/var/log/pizdato-channel.log` is 0644 → diagnostics stay categories only; tests assert no key or body leaks.

## Migration Plan

Backups go to `~/.local/share/pizdato/channel-backups/<timestamp>/` (directory 0700, env copies 0600).

The owner asked for one PR containing the spec and the whole implementation (2026-10-12).

1. TDD for the channel adapter and the agent transport; full Node 18 suite, Rust runners, live read-only Nous verdicts for a few recent stored articles compared with their stored verdicts. Owner review, green CI, merge.
2. Deploy in this order, outside minutes :04–:06:
   1. Record the checksum of `/etc/cron.d/pizdato-channel`; back up the replaced `/opt/pizdato/channel` files and both env files.
   2. Add `NOUS_API_KEY` to `pizdato-channel.env` (copied from the evening env, never printed). Both releases keep working: the old one still has `PIZDATO_LLM_BASE_URL`.
   3. Copy only the changed channel files into `/opt/pizdato/channel` by hand (never `deploy/install-channel.sh`, which rewrites cron).
   4. Install the new evening/morning release with `deploy/editorial/install.py` and confirm the `pizdato-evening` and `pizdato-morning` links point to it.
   5. Only then remove `OPENROUTER_API_KEY` and `PIZDATO_LLM_MODEL` from `pizdato-channel.env`, and `PIZDATO_LLM_BASE_URL` and `NOUS_API_KEY` from `pizdato-evening.env` (the old release would fall back to OpenRouter without the base URL).
   6. Verify: cron checksum unchanged, evening and morning `--check` pass, the next hourly run logs a Nous verdict and no OpenRouter call.
3. Rollback, in reverse: re-add `PIZDATO_LLM_BASE_URL` to `pizdato-evening.env`; switch the links back to the eb3380 release (older releases require `OPENROUTER_API_KEY` and are not rollback targets); restore the backed-up `/opt` files and re-add only `OPENROUTER_API_KEY` and `PIZDATO_LLM_MODEL`. Keep `NOUS_API_KEY` in place throughout.
4. Follow-up (owner): revoke the OpenRouter key in the OpenRouter dashboard after a one-week soak, then delete the backups that contain it.
