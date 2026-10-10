## Why

#219 launched the editorial gate on `openai/gpt-6.1-sol` below its release bar: 47/54 objective-defect trials caught (87%) against 90%, no clean text blocked. The misses are the defects the owner cares about most besides grammar: a real person's words put in Uncle Misha's mouth, words used in a meaning they do not have, and word order that makes a sentence read absurdly. One such sentence passed a dry run. The evaluation also showed how easily a rubric can be tuned to its own fixtures. Issue #222.

## What Changes

- Editor and verifier: a quotation or close paraphrase that the evidence attributes to one person but the candidate gives to Uncle Misha or another person is an `unsupported-claim` that quotes the misattributed words; the verifier may not dismiss it as persona opinion. Uncle Misha's own opinions stay free.
- Proofreader, editor and verifier: a word used in a meaning it does not have (including paronyms) and word order, modifier placement or pronoun reference that gives a sentence a second reading a typical reader would notice are language blockers; theoretical ambiguity is not.
- Writer polish names the same three checks.
- Evaluation: held-out fixture sets built and label-checked before any rubric change, a guard test against fixture text in rubrics and prompts, runs of selected fixtures and per-set reporting.
- The morning and legacy evening preflights name the endpoint host they verified.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `channel-editorial-convergence` (introduced by the unarchived `editorial-convergence` change): adds requirements; none is removed or weakened.

## Impact

deploy/editorial (rubrics, fixtures, eval, tests), deploy/morning and deploy/evening (preflight message only), docs. No gate or worker logic, Rust backend, frontend, schedule, credential or model change.
