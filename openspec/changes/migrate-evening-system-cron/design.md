# Design

OS cron starts a Bash runner from a directory under the deploy user's local share directory. The runner exports Europe/Berlin, uses an exclusive flock and a 20-minute timeout, checks the canonical daily marker and pending-send record, and runs a standalone Node tool loop against OpenRouter using deepseek/deepseek-v4.1-flash. Posts remain Russian. The runtime uses the existing OpenRouter credential and an independent private copy of the working Composio consumer credential without Hermes or Codex.

The host validates caption length, wisdom length, CTA, source and extracted cover, archives the polished draft before sending, records pending intent immediately before the send, and writes a success marker containing message ID before clearing pending intent. The model has only read-only Composio discovery/channel tools; only host code can send to the fixed account/channel. An unresolved send blocks automatic retries. A successful runtime exit without a marker is an error. Preflight and dry-run prohibit sends, success markers and pending-send writes.

Copy the existing post-polish skill and its three referenced corpora into runtime resources; no symlink or runtime read into Hermes directories. Use the existing canonical vault to retain duplicate protection and weekly context.

Install into the user's crontab, which is serviced by the system cron daemon and requires no root access. The current server timezone is Europe/Berlin; TZ also governs run dates. Do not rely on CRON_TZ support. Preserve other entries and keep the legacy 17:00 task disabled.

Rollback: remove the single tagged crontab line, retain archives/logs, reconcile pending sends. Do not automatically reactivate Hermes. Real publication is verified after the first scheduled run; preflight does not publish.
