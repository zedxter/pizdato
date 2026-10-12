## 1. Hourly verdicts

- [x] 1.1 Change the public `generateVerdict(item)`/`generatePost(item)` tests to expect the Nous endpoint, `NOUS_API_KEY` and `openai/gpt-6.1-sol` with `reasoning_effort: "low"`, `max_completion_tokens` and no temperature/OpenRouter headers; watch them fail (Nous-only channel inference: Hourly verdict; Request shape: Channel reasoning model).
- [x] 1.2 Add failing tests: OpenRouter key alone → no request and a heuristic note naming `NOUS_API_KEY`; `PIZDATO_LLM_MODEL` ignored; blank `PIZDATO_NEWS_MODEL` falls back; non-reasoning override gets temperature; the model classification table (No OpenRouter use; Default model; Request shape).
- [x] 1.3 Replace `lib/openrouter.js` with `lib/nous.js` and migrate `generate.js`; keep and re-target the timeout, HTTP/API error, empty, truncation and credential-leak tests (Nous-only channel inference: Missing Nous key, Provider failures).
- [x] 1.4 Add the touched channel files to `OWN` in `capture-goldens.mjs`; update `pizdato-channel.env.example`, the `post-evening.mjs` comment and README; run the suite on `/usr/bin/node` v18.
- [x] 1.5 Manual QA with recorded evidence: live read-only Nous verdicts for a few recent stored articles next to their stored DeepSeek verdicts; after merge, deploy per design Migration Plan step 2 and record the cron checksum, both `--check` results and the next hourly log lines (Deployment without OpenRouter).

## 2. Agent transport

- [x] 2.1 Rewrite the provider tests in `deploy/evening/test/agent.test.mjs`: Nous default, explicit key precedence, look-alike host, plain HTTP, openrouter.ai/subdomain/trailing-dot rejection, OpenRouter-only options ignored, title-routed effort, the model classification table; watch them fail (Nous default endpoint; OpenRouter endpoint rejected; Request shape).
- [x] 2.2 Update `llmConfig()`/`chat()` in `agent.mjs`, the morning default model and `eval.mjs` (drop `dialect`, default model) with a test for the eval settings; make the tests pass (Default model: Agent default).
- [x] 2.3 Write the failing "no request URL contains openrouter.ai" harness assertion first; then switch `fake-network.mjs`, `system-trace.mjs`, `delivery-network.test.mjs`, `golden-cases.mjs`, `eval-summary.test.mjs`, hosts/install/morning tests and both `runner.rs` to Nous, redefine the reasoning invariants per design 4, make fakes throw on other model hosts, implement the preflight projection, extend `OWN`, and keep the gate goldens unchanged (Editorial equivalence; No OpenRouter use: Only an OpenRouter key in the agent).
- [x] 2.4 Reword the `gate.mjs` comment; update env examples and operator docs (design 6).
- [x] 2.5 Manual QA with recorded evidence: after merge, deploy per Migration Plan step 2 and record both `--check` results and the final env variable names (Deployment without OpenRouter).
