# Durable evening delivery

Issue #214 (`openspec/changes/evening-delivery`), revised by issue #219 (`openspec/changes/editorial-convergence`).

The five-minute cron tick creates each Berlin edition at 18:00 and resumes unfinished work until it is published or its 23:00 Berlin deadline passes; an unapproved edition is then cancelled automatically (`cancellation.automatic`), printed as `EXPIRED <day>` in the cron log, visible in `--status`, and never sent later. A send starts only with at least 90 seconds of the activation left and before the deadline. Each activation has a five-minute/20-model-call/40-external-operation budget, preserving work before yielding. Routine work continues on the next tick; errors back off from five to sixty minutes; explicit longer Retry-After values take precedence. Morning keeps its schedule and bounded policy, sharing the editorial gate and final publication coordination.

## Editorial flow

The writer returns sections (hook, story paragraphs, Пиздато/Хуёво verdicts, five candidate wisdoms and the chosen one). The host renders the fixed layout and CTA, measures the caption (≤950 characters) and the wisdom (6–15 words, a fitting candidate is chosen automatically), and lints stock phrases, recurring language errors, first person, links, emoji and the Uncle Misha mention (any case). Up to three drafts per activation fix such mechanical findings before any review.

Discovery searches Bing News and fetches the original article; after three ineffective searches the host falls back to its feeds. Each review runs a proofreader on the text alone and an editor with history and evidence; every blocker they claim is checked by an independent verifier, which must name a ground to dismiss a claim and may not turn a repair into a story replacement. Blockers (spelling, grammar, punctuation, wrong phrase, meaning, unsupported claim, unusable source, repetition, AI slop) stop the post; suggestions (humor, wisdom, style, weekday category fit) never do and are applied once, in the first repair of a story. Repairs may change only the sections with findings; an echoed defect returns to the writer without a review. The editor never sees earlier findings of the same story, only which sections changed. A story is replaced after four repairs or three activations of failed mechanical repairs. Review records keep blockers, suggestions and dismissed claims with the verifier's reason.

## Model provider

OpenRouter is the default. `PIZDATO_EVENING_MODEL` selects the discovery/writer model and `PIZDATO_EDITOR_MODEL` the reviewer model. `PIZDATO_LLM_BASE_URL` with `NOUS_API_KEY` (or `PIZDATO_LLM_API_KEY`) switches every role and both slots to one HTTPS OpenAI-compatible endpoint such as Nous Portal; OpenRouter-only fields are then omitted, and the models must be ones that endpoint serves. Keys are bound to hosts, so a forgotten Nous key stops the run instead of sending the OpenRouter key elsewhere. Production launch configuration (#219): Nous Portal, `openai/gpt-6.1-sol` for writer and reviewers, reasoning effort `high` for both. Rollback: remove `PIZDATO_LLM_BASE_URL` and restore `PIZDATO_EVENING_MODEL=deepseek/deepseek-v4.1-flash`. OpenAI reasoning models (for example `openai/gpt-6.1-sol`) never receive `temperature`; their reasoning effort is `PIZDATO_REASONING_EFFORT` for discovery and writing and `PIZDATO_EDITOR_REASONING_EFFORT` for the proofreader, editor and verifier (`low` by default, `medium` or `high`). With the full confirmed history on Nous Portal one review took 5–14 s at `low` and 11–36 s at `high`, far inside the five-minute activation. Verify every change with `--check`, which proves a plain reply and strict JSON from each configured model and a tool call from the evening model without publishing. Model output is logged as `LLM model=…, tokens=…`.

## Install and inspect

Run the versioned bundle installer after approved implementation PR and green CI (`--schedule` only for the first installation; the tick cron entry already exists in production):

```sh
python3 deploy/editorial/install.py --schedule
bash ~/.local/share/pizdato-evening/tick.sh --status
bash ~/.local/share/pizdato-evening/tick.sh --check
bash ~/.local/share/pizdato-evening/tick.sh --dry-run
```

Dry runs print a separate private directory. Resume one with `--dry-run /tmp/pizdato-evening-dry-...`; only a directory marked as dry-run state is accepted. They never send or change live edition journals, publication archives, cron or public covers. Legacy `run.sh`/`agent.mjs` remain for compatibility checks and must not be scheduled alongside `tick.sh`.

The installer backs up cron, evening state and both previous bundle links while holding slot locks. Only the tagged evening cron entry is replaced. Activation starts on the installation date; older missed editions are not backfilled automatically. Status shows outstanding findings, story, age, overdue status, deadline, automatic cancellation, retry time and uncertain sends. The journal uses private atomic, fsynced writes; corrupt/unknown state fails closed and requires inspection, never automatic deletion.

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

An operator can explicitly cancel an unsent edition using `--cancel YYYY-MM-DD 'reason'`. Uncertain sends require reconciliation first. Apart from the automatic 23:00 deadline, failures and rejected drafts never cancel an edition.

## Rollback

Disable the tagged evening tick first, preserve journals/intents and acquire both slot locks. Restore bundle symlinks from the install backup's `previous.json`; keep checked cover files. Do not restore the legacy evening cron until every open or uncertain edition is reconciled, because the legacy runner cannot understand the new journal. Restore the original morning entry exactly. A successful dry run is not proof of public delivery; verify the first real scheduled message and its receipt independently.
