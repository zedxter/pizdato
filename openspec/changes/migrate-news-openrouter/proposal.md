## Why

Hourly news verdict generation relies on a Cursor subscription that has expired. Move inference to OpenRouter with DeepSeek so hourly collection can continue without Cursor login or a subscription.

## What Changes

- Use OpenRouter as the sole LLM provider for hourly verdicts and the shared evening post generator; default to `deepseek/deepseek-v3.2`.
- Configure the API key, optional model override and request timeout through the existing private channel env file.
- Preserve heuristic verdicts and evening templates on API or output failures.
- Document migration and add focused tests at `generateVerdict(item)` and `generatePost(item)` with mocked external HTTP responses.
- Preserve RSS/article fetching, deduplication, scoring, DB/vote behavior and cron schedules. The hourly job continues to write the site feed without sending a success DM or channel post.

## Capabilities

### New Capabilities

- `news-generation`: Provider selection, article-grounded verdicts, evening text generation and failure behavior for the channel cron workers, previously not covered by a dedicated capability spec.

### Modified Capabilities

None.

## Impact

`deploy/channel/lib/generate.js`, a small shared OpenRouter adapter, the channel env example, package test script and CI coverage, evening entrypoint comments, and operator documentation. The deployment at `/opt/pizdato/channel` requires an updated private env file and generation files. No changes to the Rust backend, React frontend, database schema or news ingestion algorithm. No additional production dependencies are expected.

Issue: https://github.com/zedxter/pizdato/issues/194
