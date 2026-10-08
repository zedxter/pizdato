# Scheduled channel editorial quality

Issue #205; approved specification #207. Morning (10:00) and evening (18:00) Europe/Berlin retain their existing contracts and transport protections.

## Behavior

Both writers receive confirmed full morning/evening archives from today plus the preceding 13 Berlin calendar dates. Markers drive selection; drafts are excluded. Modern receipt markers and historical Markdown/message_id markers are supported. Missing archives for confirmed publications fail visibly. The host rejects exact normalized wisdom repeats, including unquoted legacy wisdom; a separate editor checks semantic repetition.

The final rendered payload is reviewed in a fresh, tool-free model context for grammar, meaning, freshness, voice and grounding. A strict verdict must approve all dimensions. A host-owned approval is bound to the exact text hash. The writer cannot grant itself approval. The editor uses the current configured evening model, temperature 0 and a 12,000-token response allowance (including reasoning).

On a valid rejection, morning chooses a different subject/punchline; evening must select a different source/story and verify its cover. Each replacement is reviewed again, up to three candidates. Evening discovery has up to 30 model steps per candidate, so a late rejection does not consume the replacement budget; the existing 20-minute runner deadline still applies. The editor receives the primary source plus up to ten explicitly cited, fetched supporting sources, including site APIs. Failed/invalid editor calls and exhaustion stop publication; no unchecked fallback is sent. Local `reviews/` records contain the rejected or approved candidate, hash and findings. Existing pending-intent reconciliation still blocks automatic retry after uncertain delivery.

Instructions are versioned at `deploy/editorial/writer.md` and `editor.md`. They replace the installed, unversioned post-polish snapshots for these two jobs only. Global Hermes skills are unchanged. Beverage rituals are excluded as narrator filler during recovery; verified beverage-related news remains permissible. Lifting that restriction requires a later editorial decision based on observed variety, not a timer.

## Install

After review, passing CI and merge, from the canonical worktree:

```bash
python3 deploy/editorial/install.py
```

The installer takes both existing cron locks non-blockingly, creates a complete versioned release under `~/.local/share/pizdato-channel-releases/`, copies morning/evening/shared resources and the morning transport, records source revision and SHA-256 hashes, then switches both existing runtime paths to that release. Runners resolve physical paths so Node entrypoint guards work through the runtime symlinks. Neither crontab nor credentials are modified. Existing directories or symlink targets are retained in the backup record printed by the installer.

Run both installed `run.sh --check` and `run.sh --dry-run`; each must emit its explicit success sentinel. Check modes never send or create pending/success markers. Read both saved drafts and review records. Do not run `agent.mjs` through a symlink directly; use `run.sh`.

## Rollback

Use the printed backup's `previous.json`. Hold both `~/.local/state/pizdato-{morning,evening}/run.lock` locks. For each slot, replace `~/.local/share/pizdato-<slot>` with a symlink to the recorded previous directory using a temporary symlink and atomic rename. Original pre-release directories are backed up too. Release both locks only after both slots point to the same prior installation. Preserve all state, archives, receipts and pending records. Read-only checks confirm restoration; never automatically resend an uncertain publication.

## Verification

```bash
node --test deploy/editorial/test/*.test.mjs deploy/morning/test/agent.test.mjs deploy/evening/test/agent.test.mjs
rustc --test deploy/morning/test/runner.rs -o /tmp/pizdato-morning-tests
/tmp/pizdato-morning-tests
rustc --test deploy/evening/test/runner.rs -o /tmp/pizdato-evening-tests
/tmp/pizdato-evening-tests
node deploy/editorial/eval.mjs /tmp/pizdato-editorial-eval.json
```

The behavioral eval makes real non-publishing model calls: seven labeled cases, three trials each. Fixture labels cover agreement, semantic contradiction, repeated framing, natural irony, coherent exaggeration and relevant source beverage vocabulary, and circular platitudes. It does not prove that every future Russian sentence will be correct. Review the first week of actual posts for variety and missed defects.

The editor requests strict `json_schema` output with parameter-compatible provider routing and `reasoning.effort=low`; host validation remains mandatory. The selected model's public metadata advertises these parameters. See the [OpenRouter structured-output contract](https://openrouter.ai/docs/guides/features/structured-outputs) and [reasoning-budget documentation](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens). A larger total token allowance alone did not reliably prevent reasoning-only responses during repeated evaluation, so the final configuration is evaluated explicitly.
