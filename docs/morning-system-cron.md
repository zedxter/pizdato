# Morning wisdom and wish OS cron

Issue #201; companion to evening migration #199. The owner requested a daily 10:00 Europe/Berlin post consisting of Uncle Misha's witty wisdom and a short witty wish, with no links or site promotion.

## Schedule and runtime

```cron
0 10 * * * /bin/bash /home/danil/.local/share/pizdato-morning/run.sh >> /home/danil/.local/state/pizdato-morning/cron.log 2>&1 # pizdato-morning
```

This is the `danil` user crontab serviced by the OS cron daemon. Server timezone MUST be Europe/Berlin; runner TZ controls archive dates. The morning entry is separate from the active 18:00 evening entry. The paused Hermes morning task `c43917159a0e` and commented legacy 10:00 stats poster stay disabled.

Runtime directory: `~/.local/share/pizdato-morning`. Source: `deploy/morning/`. Node >=18, Bash, flock and timeout; no npm installation. The runtime has no Hermes or Codex dependency.

The morning process reads the existing OpenRouter key from `~/.config/pizdato-channel.env` and the existing Composio consumer credential/model from `~/.config/pizdato-evening.env` (0600). Model: `deepseek/deepseek-v4.1-flash`. Telegram account: `pizdato-net-channel`; chat ID: `-1004350521393`.

## Message contract

A coffee emoji decorates the fixed attribution to Uncle Misha, followed by one quoted 10–15-word original Russian wisdom, and a separate short witty wish (5–25 words). A sparkle emoji decorates the wish. The prompt requests lively conversational humor, concrete details and varied playful wishes; raw generated fields stay emoji-free. Both go through post-polish (telegram/warm/ru). No statistics, links, domains, site promotion, voting/subscription CTA, greeting, news, image, first-person narration or reaction prompt. Host validation rejects prohibited copy before sending; recent morning archives provide repetition context. The host rejects exact recent wisdom repetitions ignoring punctuation and case, and the prompt also discourages rephrased punchlines.

The model has no external tools. Host code discovers/verifies the Telegram connection and uses TELEGRAM_SEND_MESSAGE with plain text (parse_mode omitted), exact account and exact destination. No live send occurs during check/dry-run.

## Deployment and verification

From a canonical worktree:

```bash
mkdir -p /home/danil/.local/share/pizdato-morning/resources/post-polish /home/danil/.local/state/pizdato-morning
cp deploy/morning/run.sh deploy/morning/agent.mjs deploy/morning/prompt.md /home/danil/.local/share/pizdato-morning/
cp deploy/evening/agent.mjs /home/danil/.local/share/pizdato-morning/transport.mjs
cp /home/danil/.local/share/pizdato-evening/resources/post-polish/*.md /home/danil/.local/share/pizdato-morning/resources/post-polish/
chmod 700 /home/danil/.local/share/pizdato-morning/run.sh
```

The repository transport re-exports shared functions; installation copies the verified implementation locally to keep the morning runtime independent of other deployment directories. The transported module's main guard prevents the evening publisher from running when imported.

```bash
env -i HOME=/home/danil USER=danil LOGNAME=danil PATH=/usr/local/bin:/usr/bin:/bin /bin/bash /home/danil/.local/share/pizdato-morning/run.sh --check
/bin/bash /home/danil/.local/share/pizdato-morning/run.sh --dry-run
```

`--check` verifies resources, the exact named Telegram channel and an actual OpenRouter response. `--dry-run` saves only `~/.local/state/pizdato-morning/drafts/morning-YYYY-MM-DD.md`. Both prohibit sending, publication markers and pending intent. No test message is sent to the channel.

Back up the user crontab; remove only any old line ending in `# pizdato-morning`, append the active line from `deploy/morning/pizdato-morning.cron` and install the resulting file using `crontab <file>`. Preserve every other entry, particularly `# pizdato-evening`. Do not run the legacy channel installer.

Tests:

```bash
rustc --test deploy/morning/test/runner.rs -o /tmp/pizdato-morning-tests
/tmp/pizdato-morning-tests
node --test deploy/morning/test/agent.test.mjs deploy/evening/test/agent.test.mjs
bash -n deploy/morning/run.sh
```

## Archives, failures and rollback

Archive: `/home/danil/vault/pizdato/posts/morning-YYYY-MM-DD.md`. Success marker: `/home/danil/vault/pizdato/published/telegram/morning-YYYY-MM-DD.md`. Operational receipt links are kept in the archive/marker, never in the published message.

Morning runs have their own exclusive lock and 20-minute deadline. An existing daily marker skips generation. The host creates `~/.local/state/pizdato-morning/morning-YYYY-MM-DD.pending` exclusively immediately before sending. A confirmed result must include a real message ID and the exact destination chat. Save the marker/receipt before clearing pending intent. Failure or uncertainty retains pending intent and blocks automatic same-day retry.

Inspect `~/.local/state/pizdato-morning/cron.log`. Reconcile an uncertain send against the draft and actual channel before removing pending intent. If sent, recover the real receipt and marker; if definitely not sent, remove intent and rerun explicitly. Never clear it blindly.

Rollback removes only the tagged morning crontab line, retaining the evening job and all archives/logs. Do not automatically reactivate Hermes. First live publication is verified only after the scheduled run has produced a confirmed receipt and morning marker.

## Verification on 2026-10-06

The actual cron environment verified the existing named channel, independent polish resources and an OpenRouter response from deepseek/deepseek-v4.1-flash. A real non-publishing dry-run produced a validated quoted wisdom and witty wish. Eight morning Rust runner tests and five morning Node content tests passed; all fourteen existing evening tests also passed. No test post was sent. The 10:00 user crontab entry was installed and read back; the existing 18:00 line was byte-for-byte preserved and Hermes morning remains paused. First live run is scheduled for 2026-10-07 at 10:00 Europe/Berlin.

## Livelier presentation (#203)

The owner requested restrained emojis and a livelier conversational voice. The host now adds one coffee emoji to the attribution and one sparkle to the wish. Raw generated fields reject extra emojis and explicit first-person wish verbs. The prompt asks for concrete everyday humor and varied playful wishes. A real non-publishing dry-run passed with DeepSeek 4.1 Flash; nine Rust morning runner/rendering tests and seven Node content tests passed. Updated morning runtime files were copied and read back; the cron entry did not change. Rollback restores agent.mjs/prompt.md from ~/.local/state/pizdato-morning/backups/lively-203/.
