## Spec review

Five independent agent reviewers reviewed the first draft. Scope/product and compatibility approved; architecture, security/operations and QA requested changes. All blockers are resolved in this revision:

1. Architecture: the preflight golden cannot be re-captured from da0b2ed and the provenance `OWN` list would fail → goldens stay the da0b2ed record; preflight compared via a provider-neutral projection; touched files added to `OWN` (design 3). Harness assertions on OpenRouter body fields → replaced with the live invariants (design 4). Unarchived `news-generation` still required OpenRouter → archived in this PR and REMOVED via delta.
2. Security/operations: rollback could strip every Nous credential → per-step reverse rollback keeping `NOUS_API_KEY`; manual copy to `/opt` with a cron checksum instead of `install-channel.sh`; `PIZDATO_LLM_BASE_URL` removed only after the release links switch; backup modes; atomic env edits outside :04–:06; key revocation follow-up.
3. QA: added scenarios for key precedence, plain HTTP, look-alike and trailing-dot hosts, ignored OpenRouter-only options, provider failures and a model classification table; missing-credential assertions pinned to "no request" plus fallback/non-zero exit; the no-openrouter assertion is written first; deployment checks labeled manual QA with evidence.
4. Scope/product: visible verdict wording drift documented with a comparison check; morning model default covered; other OpenAI-compatible hosts stated as intentionally allowed.
5. Compatibility: confirmed the live Nous path already sends this shape; channel effort fixed at `low`; regex table-tested in both copies; Nous accepts `max_completion_tokens` for non-OpenAI models (checked live).

These agent reviews do not replace the owner's approval.
