# Audit evidence — 2026-10-08

## Active path
`crontab -l` identifies `~/.local/share/pizdato-morning/run.sh` at 10:00 and `~/.local/share/pizdato-evening/run.sh` at 18:00. Current origin/main contains their source in `deploy/morning/` and `deploy/evening/` (PRs #200, #202, #204). The older `deploy/channel/` is not the active path for these posts. An October 6 vault note describing both jobs as paused is superseded by the current crontab and publication receipts.

## Findings
1. Morning `prompt.md` names coffee as the first everyday topic and asks for the voice of a friend talking over coffee. Evening supplies a literal coffee-scrolling opening. Both published evening posts on October 6 and 7 begin with that same opening: messages 160 and 162.
2. Morning publications 161 and 163 both use coffee in the wish. Message 163 also uses coffee in the wisdom; it says cooling is noticed from an empty mug, a causal mismatch rather than a spelling problem.
3. Morning loads only quoted passages from the last 30 morning archive filenames. Wishes and evening posts are absent; the hard repetition check only compares normalized equality. Evening `read_context` loads only 14 evening files and is model-invoked, not required by the host.
4. Morning asks the generating model to polish its own text. Evening relies on a prompt instruction before `complete_post`. `validateWisdom` and `validateDraft` check shape/length and selected surface constraints, not a required grammar/meaning verdict. Neither requires approval tied to the final payload.
5. Installed polish bundles are copied local resources, outside repository version control. Their general grammar checklist and negative examples have not prevented these failures. Merely editing a shared Hermes skill would not update these installed copies.

## Executed reproduction
A read-only Node import of the installed morning validator called `validateWisdom` on a 13-word sentence with coffee incorrectly paired with a feminine past-tense adjective/verb, and `validateWish` on another coffee-based wish. Both returned successfully. The probe emitted `FAIL: publication validators accept wrong agreement and recurring coffee filler` and exited 1 deliberately. No Telegram request was made.

This demonstrates a missing deterministic publication contract, not that a model editor will reject every such draft. Model accuracy requires behavioral evaluation separately.

## Hypotheses checked
- Prompt anchoring predicts reuse of the supplied coffee scene: matched both evening archives.
- Siloed/incomplete history predicts wishes and cross-slot themes evade comparison: confirmed in both history readers.
- Format-only host checks predict malformed Russian can pass: reproduced by direct validator invocation.

## Limits
Read archived final texts and their receipts; did not independently fetch Telegram history or reconstruct intermediate drafts. The user's recurring choking motif is not present in the four recent archived posts inspected; coffee framing and literal hook repetition are directly observed. No claim that earlier grammar defects were exhaustively catalogued.
