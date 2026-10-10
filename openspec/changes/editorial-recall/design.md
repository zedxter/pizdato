## Context

The gate (`deploy/editorial/gate.mjs`) runs a proofreader on the bare text and an editor with evidence and history in parallel, then sends every claimed blocker to a verifier. The rubrics already name "attribution" under `unsupported-claim` and "a word used in a meaning it does not have" under `wrong-phrase`, yet the launch model treats Uncle Misha speaking an official's words as a staged scene and lets inverted or garbled wording pass. The fix is in the rubrics and the evaluation, not in code.

## Decisions

1. **Attribution is judged with evidence.** Only the editor and the verifier see the source, so they own the rule: words the evidence attributes to someone must keep that speaker; giving them to Uncle Misha or to another person is `unsupported-claim`, and the finding quotes the misattributed words so a repair cannot keep them. The verifier's persona and faithful-paraphrase grounds do not apply to such a claim. Uncle Misha's opinions, jokes and common sayings that reuse nobody's words from the evidence stay free. A host check is rejected: translated quotes cannot be matched deterministically.
2. **Meaning and unintended readings are language defects.** The proofreader (text only) is the primary reader; the editor and the verifier apply the same rule. The threshold is a second reading a typical reader would notice (an animate object read with the wrong verb, a modifier or price attached to the wrong noun, a pronoun that grabs the nearest wrong noun, a word whose dictionary meaning differs from the intended one). Theoretical ambiguity that context resolves is not a defect, because over-blocking is what deadlocked the evenings.
3. **Examples come from no fixture.** Every rubric example is generic. A Node test compares each fixture's text with every rubric and prompt shown to a model (Cyrillic word 4-grams, host-printed lines excepted) and checks each fixture's injected-defect pattern against them.
4. **Evaluation protocol.**
   - Dev set: the known misses (`nasa-quote-attributed-to-misha`, `stickney-wrong-phrase-wife`, `stickney-wrong-word-girth`), the dry-run slip as a new dev fixture, the related passing fixtures and the existing clean fixtures.
   - Held-out set (`held-out-222`): three clean captions approved in dry runs on real articles (BBC, Skipton library of things; Yahoo, US libraries of things; NY Post, salmon cooked in a dishwasher), corrected only where they contained defects, plus nine minimal-pair variants with exactly one injected defect each, three per class.
   - Labels are checked before commit by three independent reviewers (Claude agents, not the evaluated model): clean bases must show no objective defect to a majority, and a majority must confirm each injected defect and its class. Variants that fail are revised or dropped before commit, never after a run.
   - Held-out fixtures run only in the final evaluation and in a baseline run on the current release made after it. Tuning uses the dev set, at most three rounds. If the final run misses the bar, it is reported as is; another round needs new held-out fixtures.
5. **Preflight message.** The morning and legacy evening preflights print the endpoint host from `llmConfig()` (no key, no path) instead of the literal "OpenRouter".

## Risks

- Stricter rules can raise false blocks and slow convergence. Mitigation: unchanged verifier grounds and caps, the "typical reader" threshold, clean held-out fixtures and four evening dry runs.
- Fixtures, panel and rubrics are all written by Claude; independence holds only against the evaluated model. Labels and every post-result change are recorded.
- Three fixtures per class give wide intervals; results are reported as raw counts.
