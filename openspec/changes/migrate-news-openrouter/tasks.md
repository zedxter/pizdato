## 1. Hourly inference

- [x] 1.1 Add a failing public `generateVerdict(item)` test for OpenRouter/DeepSeek with supplied article text and no Cursor or Telegram dependency (OpenRouter inference, Default DeepSeek model, Article-grounded verdict).
- [x] 1.2 Implement the shared OpenRouter adapter and migrate hourly verdict generation; make the focused test pass (OpenRouter inference, Default DeepSeek model).
- [x] 1.3 Add failure tests one at a time for missing credentials, provider errors, timeout, empty/truncated responses, malformed JSON and invalid verdict/reason; implement the required bounded request and safe diagnostics while preserving heuristics (Bounded inference, Local failure fallbacks, Credential confidentiality).

## 2. Shared evening path

- [x] 2.1 Add a failing public `generatePost(item)` test, migrate evening generation to the shared adapter, and preserve structure validation and template fallback (OpenRouter inference, Local failure fallbacks).
- [x] 2.2 Add override/deadline configuration coverage and article enrichment coverage using mocked external HTTP, including an unreachable article that rejects before any OpenRouter request (Default DeepSeek model, Bounded inference, Article-grounded verdict).

## 3. Operator configuration and verification

- [x] 3.1 Update the channel env example, evening entrypoint comments and operator documentation; document the OpenRouter key, model/deadline defaults and obsolete Cursor settings (OpenRouter inference, Default DeepSeek model, Bounded inference).
- [x] 3.2 Add a focused channel test command and CI job, run it with the production Node version, and complete the implementation PR review and required CI (all generation requirements).
- [x] 3.3 Run a live read-only verdict check with the working OpenRouter key and an article fixture; verify a successful OpenRouter response and the requested DeepSeek model at the HTTP boundary without logging credentials or raw provider data without creating a live news row, vote or Telegram message (Article-grounded verdict, Cron compatibility).
- [x] 3.4 After approved implementation merge, back up changed deployment files, configure the private key without printing it, update `/opt/pizdato/channel`, and verify a live deployed verdict without changing the installed cron or production data (OpenRouter inference, Credential confidentiality, Cron compatibility).
