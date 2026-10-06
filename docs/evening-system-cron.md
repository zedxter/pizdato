# Evening OS cron

Issue: #199. Installed on 2026-10-06 after the owner approved immediate rollout. Source: `deploy/evening/`. No application changes and no Hermes or Codex runtime dependency.

The OS cron daemon runs the `danil` user crontab entry daily at **18:00 Europe/Berlin** (including local daylight saving transitions):

```cron
0 18 * * * /bin/bash /home/danil/.local/share/pizdato-evening/run.sh >> /home/danil/.local/state/pizdato-evening/cron.log 2>&1 # pizdato-evening
```

The server timezone MUST be Europe/Berlin; `TZ` in the runner governs dates, not cron scheduling. This is a user crontab serviced by the system daemon, not an `/etc/cron.d` file. No sudo is needed.

## Runtime and credentials

- Runtime: `/home/danil/.local/share/pizdato-evening/{run.sh,agent.mjs,prompt.md}`; Node >=18 with built-in fetch, Bash, flock and timeout. No npm installation required.
- OpenRouter: existing `OPENROUTER_API_KEY` from `~/.config/pizdato-channel.env`; dedicated model `deepseek/deepseek-v4.1-flash` in `~/.config/pizdato-evening.env`.
- Composio: existing working consumer credential copied into `~/.config/pizdato-evening.env`, mode 0600. No new account/key was created. MCP endpoint: `https://connect.composio.dev/mcp`; Telegram alias `pizdato-net-channel`, chat `-1004350521393`.
- Polish resources: standalone copies of `SKILL.md`, `KNOWN_PATTERNS.md`, `STYLE_PATTERNS.md` and `REFERENCE_CORRECTNESS.md` in `resources/post-polish/` inside the runtime directory. The original local resources were copied during migration; the runtime has no symlink/read dependency on Hermes. Retain this resource bundle when backing up or reinstalling.
- Archives: `/home/danil/vault/pizdato/posts/evening-YYYY-MM-DD.md`; success markers: `/home/danil/vault/pizdato/published/telegram/evening-YYYY-MM-DD.md`.

The model researches and polishes a draft using bounded web tools. Host code enforces lengths, wisdom, CTA, source-cover association and named channel/account; only host code can send. Covers MUST come from a fetched source's OG/Twitter metadata and pass HTTPS/MIME/byte checks. If a cover fails, choose another story. There is no image generation or text-only fallback.

## Verification and updates

From a canonical repository worktree, copy only the three runtime files; preserve the installed polish resources:

```bash
cp deploy/evening/run.sh deploy/evening/agent.mjs deploy/evening/prompt.md /home/danil/.local/share/pizdato-evening/
chmod 700 /home/danil/.local/share/pizdato-evening/run.sh
```

Run a real connection preflight using the cron environment:

```bash
env -i HOME=/home/danil USER=danil LOGNAME=danil PATH=/usr/local/bin:/usr/bin:/bin /bin/bash /home/danil/.local/share/pizdato-evening/run.sh --check
```

`--check` reads Telegram metadata, verifies polish resources and makes a minimal OpenRouter request. `--dry-run` researches and saves a draft under `~/.local/state/pizdato-evening/drafts/`; it cannot reach host publication. Neither mode sends a message or writes a publication marker. Run without a flag only for an authorized live publication. It skips an existing daily success marker.

Tests:

```bash
rustc --test deploy/evening/test/runner.rs -o /tmp/pizdato-evening-tests
/tmp/pizdato-evening-tests
node --test deploy/evening/test/agent.test.mjs
bash -n deploy/evening/run.sh
```

Installation preserves unrelated entries. Back up `crontab -l`, remove only a prior line ending in `# pizdato-evening`, append the active line from `deploy/evening/pizdato-evening.cron`, and install the resulting file with `crontab <file>`. Check with `crontab -l` and `systemctl is-active cron`. Do not run the legacy `deploy/install-channel.sh` for this migration: it enables unrelated jobs and the old 17:00 evening script.

## Results on 2026-10-06

The actual cron environment verified OpenRouter returned `deepseek/deepseek-v4.1-flash`, the existing named Composio account resolved to @pizdato_net and all polish resources were readable. A real dry-run produced a Tuesday Life Abroad draft of 943 characters, with an 11-word wisdom and a source OG cover returning HTTP 200. The final source/cover validation was independently checked after implementation changes. No post was sent during testing. Eight Rust integration tests and six Node validation/transport tests passed.

The Hermes evening job `5d6320b175be` was already paused/disabled before migration and remains so. The `/etc/cron.d/pizdato-channel` 17:00 evening entry also remains commented out. First live publication is left to the scheduled 18:00 run; success is not claimed before its Telegram receipt and daily marker exist.

## Failures and rollback

Inspect `~/.local/state/pizdato-evening/cron.log`. The runner serializes runs with `run.lock`, has a 20-minute deadline and fails if a live run lacks a success marker. Immediately before sending, the host creates `evening-YYYY-MM-DD.pending` exclusively. A failed/uncertain send retains that record; subsequent same-day live attempts fail without invoking the agent.

If pending intent exists, inspect the canonical draft and the channel for the exact post. If sent, recover its real message ID, save the success marker and archive receipt, then remove the pending record. If definitely not sent, remove the pending record and rerun explicitly. Never clear it blindly or retry an uncertain send.

Rollback removes only the tagged user crontab line and retains archives, resources, credentials and logs. Reactivate Hermes only after confirming the system entry is removed and reconciling any pending send.
