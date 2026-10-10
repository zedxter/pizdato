# Scheduled channel editorial quality

Issue #205; approved specification #207. Morning (10:00) and evening (18:00) Europe/Berlin retain their existing contracts and transport protections.

## Behavior

Both writers receive confirmed full morning/evening archives from today plus the preceding 13 Berlin calendar dates. Markers drive selection; drafts are excluded. Modern receipt markers and historical Markdown/message_id markers are supported. Missing archives for confirmed publications fail visibly. The host rejects exact normalized wisdom repeats, including unquoted legacy wisdom; a separate editor checks semantic repetition.

The final rendered payload is reviewed in a fresh, tool-free model context for grammar, meaning, freshness, voice and grounding. A strict verdict must approve all dimensions. A host-owned approval is bound to the exact text hash. The writer cannot grant itself approval. The editor uses the current configured evening model, temperature 0 and a 12,000-token response allowance (including reasoning).

On a repairable rejection, both writers keep the subject and address every finding. Each subject receives an initial submission and at most two repairs; each revised payload undergoes the entire independent review again. After two failed repairs, the host requests a different subject. Failed freshness or an unusable central source triggers immediate replacement. A removable unsupported detail or missing caveat permits repair. The gate owns the counters: at most three subjects and nine total submissions, including structural failures. Approval, exhaustion and editor errors are terminal; no unchecked fallback is sent.

Evening pins the first fetched valid primary source before unrelated caption/cover checks. A repair cannot swap that source, and an abandoned source cannot be reused. Missing/unfetched source values consume an attempt without pinning an unusable URL. Previously verified evidence and covers are reused for repairs; replacements require their own verified source/cover. Up to ten fetched supporting URLs are included for the editor. The host labels source-based posts explicitly: a plausible news event still requires evidence, unlike fictional morning observations.

Initial discovery has 30 model turns per subject. Each repair has a separate five-turn allowance, so a late initial submission still gets repair opportunities; all remain within the existing 20-minute runner deadline. The writer must submit within that allowance. Local reviews record the sequential submission, subject, revision (0 is initial), kind, exact text/hash, findings and next action. Earlier drafts of the current subject are revision context, not confirmed history or abandoned stories. Existing pending-intent reconciliation still blocks automatic retry after uncertain delivery.

This repair-first policy (#210) supersedes #208's mandatory replacement after every rejection. Search-result reliability remains a separate limitation tracked in #209; additional editorial opportunities do not guarantee successful discovery.

Instructions are versioned as the core templates `deploy/editorial/*.template.md`, composed with the channel's slots in `deploy/editorial/profiles/pizdato-channel.mjs` (see `docs/editorial-profiles.md`); edit the profile slots, not a composed copy. They replace the installed, unversioned post-polish snapshots for these two jobs only. Global Hermes skills are unchanged. Beverage rituals are excluded as narrator filler during recovery; verified beverage-related news remains permissible. Lifting that restriction requires a later editorial decision based on observed variety, not a timer.

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

The behavioral eval makes real non-publishing model calls: eleven labeled cases, three trials each. Fixture labels cover agreement, semantic contradiction, repeated framing, natural irony, coherent exaggeration and relevant source beverage vocabulary, and circular platitudes, plus repairable grounding, unusable evidence and same-subject repair. The legacy coffee contradiction accepts either rejection route while still requiring meaning=false; an isolated non-drink contradiction verifies repair routing. It does not prove that every future Russian sentence will be correct. Review the first week of actual posts for variety and missed defects.

The editor requests strict `json_schema` output with parameter-compatible provider routing and `reasoning.effort=low`; host validation remains mandatory. The selected model's public metadata advertises these parameters. See the [OpenRouter structured-output contract](https://openrouter.ai/docs/guides/features/structured-outputs) and [reasoning-budget documentation](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens). A larger total token allowance alone did not reliably prevent reasoning-only responses during repeated evaluation, so the final configuration is evaluated explicitly.
