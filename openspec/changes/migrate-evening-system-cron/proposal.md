# Move evening publication to OS cron

## Why
Hermes is moving servers. The existing evening task must continue on the current server independently.

## Changes
Install a daily 18:00 Europe/Berlin user crontab entry that runs a standalone Node agent against OpenRouter with a dedicated prompt and local post-polish resources. Preserve the canonical vault and existing Composio account. Add exclusive execution, daily duplicate checks, pending-send reconciliation and non-publishing checks.

## Impact
Deployment scripts and operational documentation only. No application or API changes. Tracks #199; the owner authorized immediate rollout without prerequisite spec review.
