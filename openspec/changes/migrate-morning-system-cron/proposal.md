# Add morning wisdom OS cron

## Why
Hermes is moving servers. The owner wants a lighter 10:00 morning message containing Uncle Misha's wisdom and a witty wish, without site promotion.

## Changes
Add an independent morning runner using the existing OpenRouter/Composio transport, a focused prompt and deterministic wisdom-only validation. Preserve the canonical archives and duplicate protection; install a companion user crontab entry.

## Impact
Deployment scripts, test coverage and documentation only. Companion to #199; tracks #201. No backend/frontend changes or evening behavior changes. Operational rollout follows the owner-approved migration workflow in this session.
