## Why

OpenRouter must no longer be used. The hourly news verdict job still calls OpenRouter with DeepSeek V3.2, and the evening/morning runtimes reach Nous Portal only through a private-env override of an OpenRouter default. Nous Portal is the team's provider, billed by subscription.

## What Changes

- Replace `deploy/channel/lib/openrouter.js` with a Nous Portal adapter; hourly verdicts and the legacy evening generator use `NOUS_API_KEY` and `PIZDATO_NEWS_MODEL` (default `openai/gpt-6.1-sol`).
- In `deploy/evening/agent.mjs` (copied to the morning release as `transport.mjs`), default the endpoint and model to Nous Portal and `openai/gpt-6.1-sol`, reject openrouter.ai, and remove the OpenRouter dialect, key and headers.
- Update tests and test harnesses that fake the OpenRouter host; keep `goldens/channel.json` unchanged as the da0b2ed record and compare the preflight through a provider-neutral projection.
- Update env examples, README and current operator docs.
- **BREAKING (operations):** `OPENROUTER_API_KEY`, `PIZDATO_LLM_MODEL` and `PIZDATO_LLM_DIALECT` are no longer read. Deployments must set `NOUS_API_KEY`.

## Capabilities

### New Capabilities

- `model-provider`: which endpoint, credential and request shape every pizdato model call uses.

### Modified Capabilities

- `news-generation` (archived from `migrate-news-openrouter` in this PR): remove "OpenRouter inference" and "Default DeepSeek model". Article grounding, fallbacks, confidentiality and cron compatibility stay.

## Impact

`deploy/channel/lib/*`, `deploy/channel/test`, `deploy/evening/agent.mjs` and its tests, `deploy/editorial` test harnesses and the preflight golden, `deploy/*/test/runner.rs` env fixtures, env examples, README and docs. No Rust backend, frontend, DB schema or cron changes. Deployment: `/opt/pizdato/channel`, a new evening/morning release via `deploy/editorial/install.py`, and private env files.

Issue: https://github.com/zedxter/pizdato/issues/229
