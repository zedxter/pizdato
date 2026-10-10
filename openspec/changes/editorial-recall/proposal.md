## Why

#219 launched the editorial gate on `openai/gpt-6.1-sol` below its release bar: 47/54 objective-defect trials caught (87%) against 90%, with no clean text blocked. The misses are the defects the owner cares about most after plain grammar: a real person's words put in Uncle Misha's mouth, words used in a meaning they do not have, and word order that makes a sentence read absurdly. One such sentence passed a dry run. The evaluation also turned out to be partly contaminated: three #219 fixtures are rubric examples verbatim. Issue #222.

## What Changes

- **`misattribution` blocker** (repairable, grounding dimension). It covers words that the evidence gives to another speaker, moves to another occasion or never contains. The finding quotes the speech tag with the words. The verifier may dismiss it only as `faithful-to-source`, `persona-opinion` or `misread`, and the host enforces this. Uncle Misha's own remarks, his reactions to credited quotes, common sayings and morning posts are exempt.
- **Wrong words and second readings** are judged on the first linear reading: `wrong-phrase` for a wrong word, term, idiom or word order, `grammar` for government and pronouns, never `meaning`. Wordplay, rare senses, readings the endings exclude, and figurative or colloquial use are exempt and are dismissed as `correct-as-written`.
- **Writer polish** names the same checks and states that slang, profanity, irony and puns stay.
- **Rubric examples** come from a published generic list. Incident phrases and restatements of #219 fixtures leave the rubrics.
- **Evaluation independence.**
  - A sealed held-out set comes from an author other than the rubric author, with near-miss clean texts. It is label-checked unanimously, and only its hash is published before the change.
  - The harness requires `--final` for held-out fixtures and records hashes and per-fixture results; run reports are committed.
  - A blocker counts only with the right span and category.
  - Release bars are set per set and per class.
- **Convergence.** Dry-run criteria, plus a rollback trigger and procedure.
- **Preflight.** The morning and legacy evening preflights name the endpoint host they verified.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `channel-editorial-convergence` (introduced by the unarchived `editorial-convergence` change): adds requirements, and adds `misattribution` to its blocker list. No requirement is removed or weakened.

## Impact

- `deploy/editorial/gate.mjs`: one category and its dismissal rule.
- Rubrics, fixtures, the evaluation harness and tests.
- `deploy/morning` and `deploy/evening`: the preflight message only.
- Docs.

No worker, Rust backend, frontend, schedule, credential or model change.
