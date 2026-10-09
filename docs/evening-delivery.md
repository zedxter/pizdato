# Durable evening delivery

Issue #214; approved specification: `openspec/changes/evening-delivery`.

The five-minute cron tick creates each Berlin edition at 18:00 and resumes unfinished work. Correctable drafts have no total revision limit. Each activation has a five-minute/20-model-call/40-external-operation budget, preserving work before yielding. Errors back off from five to sixty minutes; explicit longer Retry-After values take precedence. Old and new runnable editions rotate fairly. Morning keeps its schedule and editorial policy, sharing only final publication coordination and receipt recovery.

## Install and inspect

Run the versioned bundle installer after approved implementation PR and green CI:

```sh
python3 deploy/editorial/install.py --schedule
bash ~/.local/share/pizdato-evening/tick.sh --status
bash ~/.local/share/pizdato-evening/tick.sh --check
bash ~/.local/share/pizdato-evening/tick.sh --dry-run
```

Dry runs print a separate private directory. Resume one with `--dry-run /tmp/pizdato-evening-dry-...`; only a directory marked as dry-run state is accepted. They never send or change live edition journals, publication archives, cron or public covers. Legacy `run.sh`/`agent.mjs` remain for compatibility checks and must not be scheduled alongside `tick.sh`.

The installer backs up cron, evening state and both previous bundle links while holding slot locks. Only the tagged evening cron entry is replaced. Activation starts on the installation date; older missed editions are not backfilled automatically. Status shows outstanding findings, age, overdue status, retry time and uncertain sends. The journal uses private atomic, fsynced writes; corrupt/unknown state fails closed and requires inspection, never automatic deletion.

## Source and cover handling

After three ineffective searches the worker uses primary-source/newsroom feeds and a reserve queue. Initial endpoints, verified with HTTP 200 on 2026-10-09:

- `https://www.nasa.gov/feed/`
- `https://www.esa.int/rssfeed/Our_Activities/Space_Science`
- `https://www.sciencedaily.com/rss/top/science.xml`

Feed candidates are neither approved nor trusted instructions. Original articles, source-owned covers, recent confirmed history and the edition category are checked again. The writer moves directly to a structured draft once a candidate exists; a repaired draft retains its primary source.

The owner authorized storing checked covers on pizdato.net. Composio's live `TELEGRAM_SEND_PHOTO` schema accepts public URLs but not inline image bytes. After approval, the worker saves the validated image under `/var/www/pizdato/channel-covers/<sha256>.<extension>` and checks the public copy at `https://pizdato.net/channel-covers/...` against the same hash before sending. Existing names cannot be overwritten with different content. Files are read-only and public; the directory must be writable by the cron user and readable/traversable by Caddy. `PIZDATO_COVER_ROOT` and `PIZDATO_COVER_BASE` can override these deployment locations. Retain published cover files; they are not temporary state.

## Uncertain sends and cancellation

A timeout after send intent is persisted becomes `delivery-unknown`. The worker does not infer failure from a missing response or marker. Inspect the actual channel before reconciling. If the integration cannot read channel history, an operator must attest to inspection of the exact message and its caption/photo.

Pass a private JSON file to:

```sh
bash ~/.local/share/pizdato-evening/tick.sh --reconcile YYYY-MM-DD /path/to/evidence.json
```

For delivery confirmation the JSON requires `outcome: "delivered"`, `chat: -1004350521393`, integer `messageId`, exact `caption`, `mediaHash` from the send intent, `attestation` describing the manual verification and `reference` equal to `https://t.me/pizdato_net/<messageId>`. Wrong channel or payload is rejected. For proven non-delivery use `outcome: "not-delivered"`, a nonempty inspection attestation and evidence reference. Both decisions are recorded durably. Legacy `.pending` records must be reconciled separately before removal; do not erase them to force a retry.

An operator can explicitly cancel an unsent edition using `--cancel YYYY-MM-DD 'reason'`. Uncertain sends require reconciliation first. Normal failures and rejected drafts are never cancellations.

## Rollback

Disable the tagged evening tick first, preserve journals/intents and acquire both slot locks. Restore bundle symlinks from the install backup's `previous.json`; keep checked cover files. Do not restore the legacy evening cron until every open or uncertain edition is reconciled, because the legacy runner cannot understand the new journal. Restore the original morning entry exactly. A successful dry run is not proof of public delivery; verify the first real scheduled message and its receipt independently.
