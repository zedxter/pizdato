# Evening publication migration — IDD

Issue: #199. Owner approved immediate operational rollout on 2026-10-06, exempting this migration from prerequisite spec review.

Intent: preserve the Priscilla evening editorial workflow after Hermes moves servers.

Scope: daily OS cron at 18:00 Europe/Berlin; direct OpenRouter (deepseek/deepseek-v4.1-flash) and Composio MCP with the existing consumer credential; independent prompt and post-polish resources; shared vault archives.

Acceptance: weekday sections and third-person Uncle Misha voice; no politics/drama; polished Russian copy <=950 characters, 10–15-word wisdom and exact CTA; validated HTTPS cover extracted from the news source; choose another source if unavailable; account pizdato-net-channel and chat -1004350521393; daily marker and exclusive lock; dry-run never sends; pending sends block automatic retries.

Must not: enable the disabled legacy 17:00 publisher, depend on Hermes files after installation, post during preflight, overwrite unrelated cron entries, or change the backend/frontend.

Verification seam: invoke the public shell runner with an isolated vault and an executable runtime stand-in; Rust integration tests cover daily marker skips, runtime failures, dry-run and lock contention. Real runtime preflight only reads channel metadata. Publication remains scheduled for 18:00.

Risks: API credential expiry; source image failure; send succeeded but archive write failed. A pending-send record requires manual reconciliation before retry. Rollback removes only the dedicated user crontab entry; Hermes stays paused until explicitly restored.
