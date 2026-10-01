## Intent
Restore hourly news verdict generation after the Cursor subscription expired by using OpenRouter with DeepSeek V3.2.

## Scope
- Replace Cursor and the multi-provider fallback in the shared news generation module with OpenRouter.
- Apply the same provider configuration to hourly verdicts and evening text generation.
- Keep RSS collection, article enrichment, scoring, deduplication, SQLite writes, votes, schedules and Telegram behavior intact.
- Preserve local heuristic verdicts and evening templates when generation fails.

## Acceptance criteria
- The default model is `deepseek/deepseek-v3.2` with a configurable model and request deadline.
- No generation path starts Cursor or requires its subscription or Telegram session for inference.
- Hourly verdicts use the supplied article body and return the existing verdict/reason shape.
- API failures, missing credentials, empty/truncated output and invalid verdicts use the existing fallback without logging secrets.
- Tests cover the public generation interfaces, and a live read-only generation check succeeds before deployment.

## Constraints
No new web-search plugin: RSS and article fetching already supply the source material. No test publishes a Telegram message or inserts a live news item/vote. Secrets remain outside the repository.

## Risks and rollback
OpenRouter credit/model availability and editorial output quality require validation. Back up the deployed generation files before installation; restore those files to roll back. The backend and frontend require no changes.

## Tracking
Issue: https://github.com/zedxter/pizdato/issues/194

## Blocking decision
Owner approval of the spec PR before implementation, as required by AGENTS.md and openspec/config.yaml.
