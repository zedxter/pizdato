## Context

`gate.mjs` already separates the review mechanics from the judgement. Five spec reviews (see `review.md`) checked every line of the rubrics and gate. They found the channel-specific parts below; the slot inventory further down is the binding list.

| Where | Channel-specific part |
| --- | --- |
| `editor.md` | channel description; fixed lines and morning emojis; Uncle Misha (misattribution fix and exemptions, calibration, «pasted onto every line»); verdict lines and wisdom in the meaning, humor and ai-slop rules; weekday categories (distortion clause, `category` suggestion, calibration list); content-type paragraphs; revision section names; wisdom calibration examples; brand profanity |
| `proofreader.md` | channel name; brand profanity; fixed labels and capitalisation after them |
| `verifier.md` | «Telegram post»; Uncle Misha dismissal and attribution ground; verdict-contrast bullet; weekday-category bullet; the ground list in prose |
| `writer.md` | «scheduled channel copy»; Uncle Misha in facts; brand vocabulary; «verdict form»; «the wisdom and the wish»; beverage-ritual note; «both slots» |
| `gate.mjs` | `wisdom` argument and repetition check; content-type names; `wisdom` and `category` suggestions; `persona-opinion`, `verdict-contrast` and `loose-category` grounds; the no-evidence comment naming Uncle Misha |
| voice rules (all rubrics) | first-person narration, invented narrator scenes, emoji and the colloquial/profanity register are channel choices; for a column or a story they are content |
| `fixture-guard.mjs`, `eval.mjs`, `eval-summary.mjs` | rubric paths, host lines, one fixture file, `wisdom` mapping, one release-bar population |

These stay channel delivery code and are out of scope:
- `history.mjs` (`loadHistory`, `recentWisdoms`): the channel profile imports `recentWisdoms`.
- `compose.mjs`.
- the worker's `HOST_TEXT`.

## Goals / Non-Goals

**Goals:**
- One core that any Russian-language **short-form** publication can use through a profile: posts, columns and short stories (non-fiction or fiction) up to 4096 characters, which is one Telegram message.
- Zero behaviour change for the channel, proven by byte-identical requests and identical decisions.
- A second, structurally different example profile that passes the whole flow with fake requests.

**Non-Goals:**
- Recall changes (#225).
- Other languages.
- Texts over 4096 characters (long-form split across requests).
- History loading and delivery.
- A second production profile.
- Renaming the `persistent-evening` policy (it is stored nowhere and stays as is).

## Decisions

### 1. Templates with slots; validated up front, composed at every review
The rubric files become `editor.template.md`, `proofreader.template.md`, `verifier.template.md` and `writer.template.md`. The rename makes any stale `readFile('…/writer.md')` fail with ENOENT instead of leaking `{{slot}}` text into a prompt.

Slots are whole sentences, clauses or bullets, never single words. A slot owns its surrounding whitespace and markup, so an empty slot leaves no empty bullet.

- `composeRubric(name, profile)` substitutes the slots and throws on a leftover `{{`.
- `validateProfile(profile)` composes all four templates and throws an error with `code: 'EDITORIAL_CONFIG'` on:
  - a slot missing from the profile;
  - a slot that none of the four templates uses;
  - a leftover placeholder;
  - a missing `id`;
  - `language !== 'ru'`;
  - the consistency failures of decision 3.

`validateProfile` runs in `createGate` (synchronously, using a template cache that is read once and refreshed when a file's mtime changes) and in every `--check` path. At review time the gate composes again from the current files, as today.

Runtime handling of `EDITORIAL_CONFIG`:
- **Evening worker.** It is not a `reviewFailure`. It does not count toward `FAILURES_PER_STORY` and does not abandon a story. The worker records it as `lastError` and stops the activation. The next tick retries, and the error stays visible in the logs.
- **Morning.** The run fails before any model request.

*Alternative rejected:* plain core rubrics with an appended profile section. It changes the prompts and needs a full LLM evaluation. A later change may reorganise the templates with an evaluation, once real profiles exist.

### 2. Profile shape
A profile is a frozen ES module export (`profiles/pizdato-channel.mjs`; the neutral and example profiles live under `deploy/editorial/test/profiles/` and are not installed). It holds:

- **Identity:** `id`, `language: 'ru'`.
- **Structure:**
  - `persona` (`null` or `{name}`);
  - `verdictLines` (boolean);
  - `categories` (`null` or a short description; the channel uses weekday categories);
  - `suggestions`: extra suggestion categories, which the channel sets to `['wisdom']`;
  - `contentTypes: {withSource, withoutSource}`;
  - `maxChars` (≤ 4096).
- **Inputs:**
  - `fields`: extra editor input keys, in order; the channel has `['wisdom']`;
  - `unique(fields, history)` → host repetition findings; the channel reproduces «Wisdom repeats a confirmed publication.» exactly.
- **Text:** `slots`, an object of strings. This includes a `voice` slot holding the first-person, narrator-scene, emoji and register rules, and the brand-vocabulary passages.

### 3. Profile-dependent enums, with prose checked against them
These lists are core constants plus profile additions, inserted at their current positions so the channel order and bytes stay identical:

| List | Added only when |
| --- | --- |
| `SUGGESTIONS = ['humor', …profile.suggestions, 'style', …'category']` | `category` only when `categories` is set |
| `GROUNDS`: `persona-opinion` | `persona` is set |
| `GROUNDS`: `verdict-contrast` | `verdictLines` is true |
| `GROUNDS`: `loose-category` | `categories` is set |
| `ATTRIBUTION_DISMISSAL`: `persona-opinion` | `persona` is set |

Blockers, the language and attribution dismissal rules, and every host rule are the same for all profiles.

`validateProfile` checks the prose against the enums:

- **Grounds:** every ground token in the composed verifier text is in `GROUNDS`, and every element of `GROUNDS` appears in it.
- **Suggestions:** the same check for the suggestion tokens in the editor text.
- **Content types:** the same check for the content-type names in the editor text.
- **Persona:** when `persona` is null, the composed rubrics contain no persona name.

The no-evidence misattribution rule (`source === null`) stays core. Its comment is rewritten in generic terms: without evidence there is no speaker to check against, and an invented quote of a real person is still caught as `unsupported-claim` by the editor and verifier rules.

### 4. Reviewer options
- `reviewOptions(profile)` returns frozen `{editor, proofreader, verifier}` options, memoized per profile, and the gate exposes them as `gate.options`.
- The existing exports `editorOptions`, `proofreaderOptions` and `verifierOptions` remain as the `pizdato-channel` instances, so identity routing in tests and callers keeps working.
- `network.check` and the review default in `network.mjs` use the options of the profile the worker uses (the channel).
- The request titles `pizdato-editor`, `pizdato-proofreader` and `pizdato-verifier` are infrastructure labels. They route reasoning effort in `agent.mjs`, stay core constants, and are excluded from the channel-term check.

### 5. Gate input
`review({text, source, fields = {}, changedSections, hostText})`:

- **Editor message.** It is `{contentType, candidate, ...fields in profile order, history, source, current, …}`, which reproduces today's key order.
- **Field checks.** A field is missing when `!(key in fields) || fields[key] === undefined`. A missing or undeclared field throws `EDITORIAL_CONFIG` before any request. Every current channel caller always passes a string wisdom, so this check cannot change a request that da0b2ed would have sent.
- **Length.** A text longer than `profile.maxChars` throws before any request. The channel's 950-character limit applies earlier, in `compose.mjs`.

### 6. Single source for the writer polish
`composeRubric('writer', profile)` is the only way to read the polish. The morning agent (`agent.mjs:41`), the legacy evening agent (`agent.mjs:158`) and the evening network (`network.mjs:111`) all call it with the channel profile. Production entrypoints import `pizdato-channel` directly; there is no profile selection by environment, and a test pins this.

### 7. Proof of equivalence
- **Capture.** `deploy/editorial/test/capture-goldens.mjs --baseline <worktree>` works as follows:
  1. It runs against a worktree checked out at da0b2ed (`.worktrees/baseline-da0b2ed`). It asserts `git rev-parse HEAD` and refuses a gate that accepts `profile`.
  2. It imports the old gate through its old API and drives it with scripted fake answers.
  3. It writes `test/goldens/channel.json`, recording the baseline commit, the four rubric sha256 values and every case.
- **Baseline validity.** Before capture the script asserts that `git diff da0b2ed HEAD -- deploy/` touches only the files of this change. If another `deploy/` change merges first, the baseline moves to the new merge base and the goldens are recaptured.
- **Cases.** Each case records:
  - every request as the exact `JSON.stringify(messages)` and `JSON.stringify(options)` strings, keyed by title and per-title sequence number;
  - the scripted answers;
  - the returned verdict and `nextAction`;
  - every `record()` entry;
  - `snapshot()`.

  The cases are:
  1. a morning observation;
  2. an evening first review with a source;
  3. an evening revision with changed sections and a verifier round;
  4. a malformed first answer (retry message);
  5. a verifier dismissal on a ground outside the allow-list;
  6. a host-owned quote;
  7. a misattribution claim with `source === null`;
  8. a repeated wisdom (host blocker);
  9. a replace decision and a story advance under the `persistent-evening` policy;
  10. the `network.check` preflight requests.
- **Comparison.** The golden test compares the strings with `assert.equal`. It also pins the da0b2ed sha256 of each rubric (the channel composition must match it) and of `writer.md` (the polish every caller uses must match it).
- **Existing tests.** They pass unchanged except where they construct the gate or call `review` (`fields: {wisdom}` instead of `wisdom`). The goldens carry the decision proof, so a test rewrite cannot hide a change.
- **Provenance.** The eval report records the profile id, the profile module sha256 and the composed rubric sha256 values. For the channel these equal the da0b2ed report values, which gives an independent check.

### 8. Evaluation per profile
- `eval.mjs --profile <id>` loads `profiles/<id>/fixtures.json` and an optional sealed held-out set with its sha256. The channel keeps its current paths as defaults, so its runs are unchanged.
- Fixture inputs map to the profile's `fields`. The channel keeps `wisdom: fixture.wisdom || fixture.text`.
- The release bar is computed per profile.
- The contamination guard runs over each profile's composed rubrics and host lines. A test seeds a fixture n-gram into a slot and expects a finding.
- **Production rule.** A repository test asserts that every profile under `deploy/editorial/profiles/` other than `pizdato-channel` has fixtures and a committed report whose `releaseBar` is true. The default bar is the channel's: every clean trial passes, at least 90% of objective trials are caught, and there is at least one sealed held-out set. A profile may tighten the bar but not loosen it.

### 9. Two non-channel test profiles
- **`neutral`** has no persona, verdict lines, categories, fields or extra suggestions. Its composed rubrics are committed as snapshots for review and checked by a lint for:
  - doubled spaces;
  - « ,», «()» and «..»;
  - empty list items;
  - a dangling «и/или/and/or» before punctuation;
  - lines that start in lower case.

  They must contain none of these terms (case-insensitive):
  - pizdato, Пиздато, Хуёво;
  - Миша, Misha, дядя;
  - Мудрость, wisdom;
  - Telegram, канал, channel;
  - утр, morning, вечер, evening;
  - weekday, рубрик, CTA, ☕, ✨;
  - the weekday names.
- **`example-column`** is a structurally different example for a site column or short story:
  - first-person narration and invented scenes are allowed, with a neutral register;
  - a persona;
  - one field `title` with its own `unique()`;
  - no verdict lines.

  It runs through the whole fake-request flow. This proves that the slot set fits a second consumer at no LLM cost.

## Risks / Trade-offs

- **Templates may be awkward to read.** Mitigation: whole-sentence slots, the slot table in `docs/editorial-profiles.md` (a test checks that every slot is listed there) and the committed neutral snapshot.
- **The core still uses examples written for the channel.** They are generic Russian and stay. The banned-term check catches leftovers.
- **A new profile is unmeasured.** Mitigation: the production rule in decision 8.

## Migration Plan

1. Capture the goldens from the da0b2ed worktree.
2. Change the gate, templates, profiles, callers and harness under TDD.
3. Run CI, code review and merge.
4. Install, run `--check` for both slots (it now composes and validates the rubrics), then one isolated evening dry run and one morning dry run.

Rollback:
1. Take the `run.lock` flocks of both slots.
2. Atomically re-point `~/.local/share/pizdato-morning` and `pizdato-evening` (symlink plus rename) to the paths in the backup's `previous.json`.
3. Confirm that each `manifest.json` reports revision da0b2ed.
4. Run `--check` for both slots.

No state migration is needed, because the gate snapshot stores no policy name or profile.
