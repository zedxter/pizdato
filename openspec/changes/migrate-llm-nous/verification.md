## Verification (pre-deployment)

- Channel suite: 33/33 on production `/usr/bin/node` v18.20.4, including Nous endpoint/model/request shape, OpenRouter-key-only fallback without a request, stale `PIZDATO_LLM_MODEL` ignored, blank/non-reasoning overrides, the model classification table, timeouts, HTTP/API/empty/truncated failures and credential-safe diagnostics.
- Evening, morning and editorial suites: 293/293 on Node 18 (291 on Node 22 before the two new `--check` tests); both new "only an OpenRouter key" `--check` tests fail on the previous transport and pass now. Gate goldens unchanged; the preflight matches the da0b2ed questions through Nous with no OpenRouter fields or headers. Rust runners: evening 15/15, morning 11/11; `rustfmt --check` clean.
- Live read-only check (2026-10-12) through `generateVerdict` with `NOUS_API_KEY` loaded from the private env file and the OpenRouter variables removed: the five newest stored articles; network hosts were only the news sites and `inference-api.nousresearch.com`. Each verdict took 3.6–4.6 s with no fallback notes. One article was unreachable and was rejected before inference (existing behavior). Compared with the stored DeepSeek verdicts, 2 of 4 agree; Nous judged the Christ the Redeemer construction story and the Ovechkin record as «пиздато» where DeepSeek said «хуёво». Wording drift is expected (idd.md). No news row, vote or Telegram message was created.

## Deployment (2026-10-12)

- PR #230 merged as `129f9fc` after green CI; `main` CI and the site deploy workflow passed on `129f9fc`.
- Backups: `~/.local/share/pizdato/channel-backups/2026-10-12T07-40-47Z-nous/` (0700): replaced `/opt` files, both env files (0600), cron checksum and previous release links; the installer's own backup is `~/.local/state/pizdato-editorial-backups/20261012T074102384072Z`.
- `NOUS_API_KEY` was added to `~/.config/pizdato-channel.env` before anything else changed; values were never printed.
- `/opt/pizdato/channel` updated by hand from `129f9fc` (identical to `deploy/channel` apart from `node_modules`); `lib/openrouter.js` removed. `deploy/install-channel.sh` was not run; `/etc/cron.d/pizdato-channel` sha256 `b708224a…5955` unchanged.
- Evening/morning release `129f9fc35eb1-20261012T074102384072Z` installed with `deploy/editorial/install.py` (no `--schedule`); both links switched before the env cleanup. The crontab is unchanged.
- Then removed `OPENROUTER_API_KEY`, `PIZDATO_LLM_MODEL` and the obsolete commented Cursor/OpenRouter template lines from `pizdato-channel.env`, and `PIZDATO_LLM_BASE_URL` and the duplicate `NOUS_API_KEY` from `pizdato-evening.env` (both 0600, atomic replace). Final variable names: channel `TELEGRAM_ACCOUNT_ID`, `TELEGRAM_SESSION_CWD`, `NOUS_API_KEY`; evening `COMPOSIO_CONSUMER_KEY`, `PIZDATO_EVENING_MODEL`, `PIZDATO_EDITOR_MODEL`, `PIZDATO_REASONING_EFFORT`, `PIZDATO_EDITOR_REASONING_EFFORT`.
- Cron-environment `--check`: evening `PREFLIGHT_OK` (five requests, `openai/gpt-6.1-sol`); morning `PREFLIGHT_OK: model endpoint inference-api.nousresearch.com`.
- Deployed read-only verdict through `/opt/pizdato/channel` with a fixture article: `pizdato`, no notes, only network host `inference-api.nousresearch.com`, no OpenRouter key in the environment.
- Live runs: the 10:00 morning post published once (message 169) with `openai/gpt-6.1-sol`; the 10:05 hourly run logged `verdict with Nous...` and saved news item 1182 (`huyevo`, no fallback notes). No OpenRouter call since the deployment.

Follow-up for the owner: revoke the OpenRouter key after a one-week soak, then delete the backups that contain it.
