## Verification and deployment

- Spec PR #195 merged after owner approval and passing CI.
- Implementation PR #197 merged after architecture and scope/QA reviews and all CI checks passed, including the new Channel (Node 18) job.
- 26 public generator tests passed on production `/usr/bin/node` v18.20.4. Tests covered DeepSeek selection, supplied article text, article enrichment/unreachable sources, model/deadline configuration, HTTP/network/API errors, malformed/empty/truncated output, non-string reasons, credential-safe diagnostics and the existing local fallbacks.
- Live read-only checks before and after deployment verified a successful response from `https://openrouter.ai/api/v1/chat/completions` using `deepseek/deepseek-v3.2`, with a `pizdato` verdict and Russian reason for a positive fixture. The checks asserted that no fallback notes were returned. They did not invoke cron entrypoints, insert production news/votes or send Telegram messages.
- Updated `/opt/pizdato/channel` from the reviewed implementation. Configured the working OpenRouter key in `~/.config/pizdato-channel.env` with mode 0600; the value was not printed or committed.
- Backed up replaced deployment files and the previous private env file under `~/.local/share/pizdato/channel-backups/2026-10-01T08-35-23.148Z/`; the backup directory is mode 0700 and the private env backup is mode 0600.
- Verified the installed cron was byte-for-byte unchanged. Hourly collection remains enabled at minute 05; the existing disabled daily/report/evening jobs remain disabled.

Rollback: restore the replaced deployment files and, if needed, the private env backup. The previous generator still requires the unavailable Cursor subscription for its primary path.
