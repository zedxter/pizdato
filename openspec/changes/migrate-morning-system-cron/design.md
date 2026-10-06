# Design

A dedicated Bash runner at 10:00 Europe/Berlin holds a morning-only lock and checks canonical morning success/pending files. A small Node runtime uses the existing shared transport functions exported from the evening agent; a local transport re-export supports repository tests, and deployment copies the same transport implementation into the morning runtime directory. Only exports and optional request attribution are added to the evening module; evening defaults/behavior remain unchanged.

OpenRouter generates a structured wisdom with DeepSeek 4.1 Flash using a dedicated prompt, the independent existing post-polish bundle and recent morning archives. Host code validates 10–15 words, wisdom plus a 5–25-word wish, no URLs/domains/promotion/statistics/first-person narration, and no recent duplicate. The host renders the fixed attribution/quotation format and a separate wish paragraph, then sends plain text once via the existing Composio account. The model has no external tools.

Before sending, archive the copy and exclusively create pending intent. Confirm the exact Telegram chat/message receipt, atomically save the success marker, append the archive receipt and clear pending intent. No automatic retry of uncertain sends. Check/dry-run never reach publication.

Installation adds only the tagged user crontab line and leaves the evening line untouched. Existing Hermes morning job and legacy system stats poster are already disabled and stay disabled. Rollback removes only the morning line and retains archives/logs.
