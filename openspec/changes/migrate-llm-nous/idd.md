## Intent
Use Nous Portal as the only model provider in pizdato and stop using OpenRouter.

## Background
The evening and morning runtimes already call Nous Portal (`openai/gpt-6.1-sol`), but only because the deployment's private env overrides an OpenRouter default. The hourly news verdict job (`deploy/channel`) still calls OpenRouter with `deepseek/deepseek-v3.2` every hour and is the only writer of the site news feed (`news_items` and system votes), so it cannot be switched off.

## Scope
- Hourly verdicts and the shared legacy evening generator in `deploy/channel` call Nous Portal only.
- The evening, morning and editorial runtimes default to Nous Portal, refuse an openrouter.ai endpoint and no longer read `OPENROUTER_API_KEY` or send OpenRouter-only request fields or headers.
- Env examples, README and operator docs describe Nous Portal; history documents stay unchanged.
- The deployment drops `OPENROUTER_API_KEY` and the stale DeepSeek model from the private env files and keeps one `NOUS_API_KEY`.

## Acceptance criteria
- No runtime in this repository sends a request to openrouter.ai, and an OpenRouter key alone never enables inference.
- Hourly verdicts keep article grounding, the verdict/reason shape, the heuristic fallback, credential-safe diagnostics and their cron behavior.
- The default model is `openai/gpt-6.1-sol`; reasoning models receive `reasoning_effort` and no temperature.
- Evening and morning `--check` preflights pass against Nous Portal in the real cron environment after each deployment step.
- After deployment, the hourly job stores a verdict made by Nous Portal, and the log no longer contains OpenRouter calls.

## Expected visible change
Hourly verdict and reason wording on the site feed changes with the model (DeepSeek V3.2 → gpt-6.1-sol). Prompts stay the same. The pre-deployment check records Nous verdicts for recent stored articles next to their stored DeepSeek verdicts, so the drift is visible to the owner.

## Must not
- Change prompts, rubrics, editorial decisions, ingestion ranking, DB/vote transactions or cron schedules.
- Print or commit credentials.
- Rewrite the installed `/etc/cron.d/pizdato-channel`, run `deploy/install-channel.sh`, or reactivate disabled jobs.
- Leave evening or morning without a working credential at any point of the rollout.

## Risks and rollback
Nous Portal outage → the existing heuristic verdict/template fallbacks and the evening repair loop. A reasoning model is slower than DeepSeek (≈6 s per verdict measured) but well inside the 60 s deadline. Roll back by restoring the backed-up deployed files and env files.

## Tracking
Issue: https://github.com/zedxter/pizdato/issues/229

## Blocking decision
Owner approval of the spec PR before implementation (AGENTS.md).
