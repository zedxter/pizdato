## Context

See proposal.md for motivation and idd.md for acceptance criteria. `deploy/channel/lib/generate.js` contains two public generation entrypoints and duplicated API fallback logic after Cursor subprocess attempts. RSS collection and article fetching are implemented independently in `lib/news.js`. The active job in `/etc/cron.d/pizdato-channel` invokes `/usr/bin/node post-hourly.mjs` from `/opt/pizdato/channel` at minute 05. Evening and daily Telegram jobs are currently commented out.

## Goals / Non-Goals

**Goals:** Keep the generation interfaces stable, isolate provider configuration and transport in a shared adapter, and make inference independent of Cursor and Telegram.

**Non-Goals:** Change ingestion ranking, prompt semantics, DB/vote transactions, cron activation or article extraction. The Rust backend and React frontend require no changes.

## Decisions

1. Use a small shared `lib/openrouter.js` adapter using Node's built-in fetch. Both generators continue to validate output and own their existing fallbacks. Remove Cursor subprocess logic and OpenAI/Groq fallback selection so missing OpenRouter credentials cannot silently select another provider. Keeping the old multi-provider branch was considered, but it would retain unwanted subscription/provider ambiguity.
2. Default to `deepseek/deepseek-v3.2` with `PIZDATO_LLM_MODEL` override, a 60-second default deadline via `PIZDATO_LLM_TIMEOUT_MS`, bounded output tokens, and reasoning disabled. Handle non-2xx HTTP responses, embedded API errors, empty output and truncation before parsing. Validate deadline configuration so invalid values cannot create an unbounded request. Reduce transport errors to safe categories instead of forwarding arbitrary error messages. Do not emit raw response bodies or credentials in errors. Article-fetch failures retain their existing failure behavior.
3. Do not enable the OpenRouter web plugin: hourly ingestion already fetches RSS and article text, and the existing prompts explicitly restrict generation to supplied text. Extra web search would add cost and change grounding behavior.
4. Use the existing private `~/.config/pizdato-channel.env` for credentials. During migration, reuse the owner's working OpenRouter key from the receipt configuration if the pizdato key is absent; transfer it locally without printing it or adding a runtime dependency on the other project. Keep the env file mode 0600.
5. Verify the existing public `generateVerdict(item)` and `generatePost(item)` interfaces with Node tests that mock only external HTTP and provide fixture articles. No tests write the production DB or send Telegram messages. Add this focused suite to CI; no Rust implementation changes are necessary, so Rust is covered by existing CI rather than artificial provider tests.

6. Keep verdict and its free-form Russian reason in one DeepSeek request. Jev was considered for binary classification, but TypeSafe documents that it returns typed choices/probabilities and does not generate explanations. Preserving the current feed would therefore require a second generative request or a change to the reason feature. For one hourly item, a single generative request is the simpler migration. A later Jev experiment can compare classification on representative Russian articles before changing the production pipeline. Sources: https://docs.typesafe.ai/concepts/system-one and https://openrouter.ai/labs/jev .

## Risks / Trade-offs

- Provider credit, outages or model availability → Existing heuristic/template fallback and bounded requests.
- Editorial variation or malformed output → Existing validators plus fixture checks and a live generation smoke check before installation.
- Production Node differs from the receipt deployment → Run focused tests with `/usr/bin/node`, which the pizdato cron uses, and avoid unsupported APIs.
- Installer rewrites cron and can reactivate currently disabled jobs → Update only reviewed generation files in `/opt/pizdato/channel`; retain the installed cron exactly.

## Migration Plan

1. Obtain owner approval and merge the spec PR after its review and CI gates; implement the approved tasks in a separate implementation PR.
2. Run tests with mocked external HTTP, existing required CI, and a live read-only verdict request using a fixture or a previously stored article. Do not invoke a cron entrypoint that could publish or notify during verification.
3. After implementation review, passing CI and merge, back up changed deployed files outside the checkout. Configure the private key and install the updated adapter/generation files while retaining schedules, DB and sessions.
4. Validate a live verdict through the deployed public interface without a news insert or vote. The next scheduled hourly run uses the new provider.
5. Roll back by restoring the deployed generation files from the backup; keep the private key because it is harmless to the prior code. Cursor remains unavailable without renewing the old subscription.
