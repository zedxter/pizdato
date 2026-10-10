## Context

The gate (`deploy/editorial/gate.mjs`) runs a proofreader on the bare text and an editor with evidence and history in parallel, then sends every claimed blocker to a verifier. Claims that both readers raise skip the verifier (a deliberate #219 choice). The rubrics name "attribution" under `unsupported-claim` and "a word used in a meaning it does not have" under `wrong-phrase`. Even so, the launch model treats Uncle Misha speaking an official's words as a staged scene, and it lets wrong words and absurd second readings pass. The evaluation that measured this had its own problem: some rubric examples were copied from fixtures.

## Decisions

1. **Misattribution becomes a category with restricted dismissals.**
   - A generic `unsupported-claim` can be dismissed on any ground, so a verifier answering "Misha ironically echoes NASA" (`understood-joke`) would publish the misattribution. A new repairable category `misattribution` (grounding dimension) lets the host enforce the allowed grounds: `faithful-to-source`, `persona-opinion` (Misha's own remark, or a reaction that presents nobody else's words as his) and `misread`.
   - A speaker is a person or an organisation, named or by role. Words moved to another occasion and invented words presented as a real speaker's count too. Everyday-observation (morning) posts are exempt, because they have no evidence and the host credits every morning wisdom to Misha.
   - Cost: one constant and one condition in `gate.mjs`; the editor and verifier schemas take their enums from `BLOCKERS`.
2. **The finding quotes the speech tag with the words.** If only the words were quoted, restoring the speaker would keep them verbatim, and the echo check would return them as "still present", pushing the writer to drop a genuine quote.
3. **Wrong words and second readings are judged on the first linear reading.** Context resolves every motivating miss (nobody believes the neighbour was cooked), so "context resolves it" cannot be the exemption.
   - Exempt: a reading that needs a rare sense or a parse the endings exclude; wordplay with two real senses where the second is the joke; an altered saying; figurative, ironic or colloquial use; a word with two recorded senses used in either; an ellipsis the neighbouring words restore.
   - Categories: `wrong-phrase` for a wrong word, term, idiom or word order; `grammar` for government, agreement and pronouns. Never `meaning`, which `understood-joke` could clear.
   - The verifier dismisses exempt cases with `correct-as-written`, defined so that grammaticality alone is not correctness; it dismisses a misparse with `misread`.
   - The claim's `problem` names both readings.
4. **Corroborated claims keep skipping the verifier.** This is the #219 protection against a single verifier veto. With identical exemptions for both readers, a corroborated false block on a pun is possible, so it is measured rather than assumed away: every new-class blocker records its reader, and near-miss fixtures and dry runs must show no corroborated false block. If one appears, the fallback is to verify corroborated language claims, which may then be dismissed only as `correct-as-written` or `misread`.
5. **Rubric examples come from a published list.**
   - Examples: «эффектное лекарство» and «экономный двигатель» (paronyms); «площадь» where a volume is meant (a same-field term); «оплатить за проезд» (clashing constructions); «Рыбу заставили почистить мужа» (an object read with the wrong verb); «няня для ребёнка без вредных привычек» (a misplaced modifier). Exemptions: «Таких денег он не видел», «Мать любит дочь», «деньги на плотину утекли», «шутка не зашла», «просмотреть», «Ему — счёт, мне — чек». Hyphenation: «пол-яблока».
   - The incident phrases and restatements of #219 fixtures leave the rubrics: «меньше земной больше чем в тысячу раз», «листал ленту за кофе», «пол-луны», "an empty mug cannot prove the coffee went cold" and "a lottery win sold as a life hack".
   - The guard test enforces literal separation: Cyrillic 4-grams, injected spans and expectedQuote patterns; only the host-printed labels and CTA are exempt.
   - An independent reviewer checks the final rubric diff for restatements before the final run.
6. **Evaluation protocol.**
   - **Dev set (`dev-222`).** The rubric author's fixtures: minimal pairs on three dry-run articles (BBC, Skipton library of things; Yahoo, US libraries of things; NY Post, salmon in a dishwasher), the dry-run slip, and the label panel's natural find «к дню». Their labels are panel-checked, and they shape the rubrics.
   - **Held-out set (`held-out-222`).** Written by an agent that is not the rubric author, from articles no other fixture uses, with distinct topics. Each article gives one clean text, one variant per class and two clean near-misses (a credited quote with Misha's reaction, and a deliberate pun or an inversion whose endings fix the roles).
     - Three panel reviewers independent of the evaluated model must agree unanimously: clean texts are listed blind and must show no defect; each variant must have exactly one defect of its class.
     - Labels, `injected` spans and expected categories are frozen.
     - The file stays outside the repository. Its sha256 is committed and posted on #222 before the gate and rubric changes; the final run adds the file and verifies the hash.
   - **Pass rule.** One kept blocker must match the injected span on `quote` and carry an expected category; fixtures without a span keep their regex. `nasa-quote-attributed-to-misha` returns to `grounding` only: the #219 relabel to also accept `voice` is reversed, because that is the failure this issue fixes.
   - **Harness.** It refuses held-out fixtures without `--final` and records the revision, uncommitted changes, the fixture and rubric hashes, the selection, per-fixture k/3 and each blocker's reader. Every run report is committed under `deploy/editorial/eval-runs/`.
   - **Tuning.** A round is one rubric commit plus one dev run, at most three rounds.
   - **Baseline.** The release (b9b2552, worktree) runs back to back with the final run on the same fixture files.
   - **Label audit.** The motivating misses are confirmed by the same kind of panel before the final run; one the panel does not confirm unanimously is reported as borderline, with the votes.
7. **Convergence and rollback.**
   - Four isolated evening dry runs must each be approved within two activations without a story replacement; #221's dry runs were approved on their first review. Three morning dry runs must succeed.
   - Every new-class blocker is logged and judged.
   - Rollback trigger: the first live evening after deployment is still unapproved at 19:00 Berlin, or a false block on a quote, on Misha's line or on wordplay appears in the live logs. Rollback restores the release links from the installer backup's `previous.json`. Rubrics are read on every review, so it takes effect on the next tick.
8. **Preflight message.** The morning and legacy evening preflights print the endpoint host from `llmConfig()` (no key, no path).

## Risks

- Stricter language rules can raise false blocks. Mitigation: the exemption list, the verifier mapping, near-miss fixtures, dry-run criteria and the rollback trigger.
- The fixtures, panels and rubrics are all written by Claude agents, so independence holds against the evaluated model and between the authors' sessions, not across model families. The panel votes are committed.
- Three articles per class give wide intervals (a Wilson 95% lower bound of 88% even at 27/27 trials). The held-out set detects gross failure; results are reported as raw counts per fixture.
