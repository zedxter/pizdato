# Editorial profiles: adding a publication

The editorial gate in `deploy/editorial/` reviews any Russian short-form text through a **publication profile**. The core owns the review flow, the blocker categories, the host rules, the approval and budget mechanics and the rubric templates. A profile owns everything that belongs to one publication. @pizdato_net is the profile `pizdato-channel` (`deploy/editorial/profiles/pizdato-channel.mjs`). Spec: `openspec/changes/editorial-profiles/`, issue #226.

```js
import {createGate} from './deploy/editorial/gate.mjs';
import profile from './deploy/editorial/profiles/pizdato-channel.mjs';
const gate=createGate({profile,request,history,record,policy:'persistent-evening',initial});
const verdict=await gate.review({text,fields:{wisdom},source,changedSections,hostText});
```

`createGate` validates the profile before anything else; so does every `--check` path. An invalid profile, a missing or undeclared field and an oversized text throw an error with `code: 'EDITORIAL_CONFIG'` before any model request. That error never consumes a story: the evening worker records it as `lastError` and stops the activation, the morning run fails before its first request.

## Slot table

The rubrics are `editor.template.md`, `proofreader.template.md`, `verifier.template.md` and `writer.template.md`. A `{{slot}}` is a whole sentence, clause, phrase or bullet and owns its surrounding whitespace and markup: a bullet slot ends with `\n`, a clause slot starts with its own space or punctuation. An empty string removes the passage cleanly. `composeRubric(name, profile)` fills one template; `validateProfile(profile)` composes all four and fails on a missing slot, a slot no template uses, a leftover `{{`, or prose that disagrees with the enums (see the last column). Slots named `voice…` carry the voice rules: first-person narration, invented narrator scenes, emoji and register.

| Slot | Template | Holds | Empty allowed |
| --- | --- | --- | --- |
| `editorRole` | editor | The opening sentence: who the editor works for. | no |
| `editorFields` | editor | A clause (starting with `;`) explaining the profile `fields` the editor receives. | yes, without fields |
| `meaningConclusion` | editor | A `meaning` clause (leading space, trailing `;`) about conclusions that do not follow. | yes |
| `meaningParts` | editor | A clause naming the parts of a text that must not repeat each other. | yes |
| `categoryDistortion` | editor | A clause about bending a story to fit the categories. | yes, without categories |
| `misattributionFix` | editor | A clause: what a misattribution fix may do besides restoring the speaker. | yes |
| `misattributionExempt` | editor | A sentence (leading space): what is never misattribution, e.g. the persona's own remarks. | yes |
| `voiceSlopScenes` | editor | The `ai-slop` item for invented narrator scenes, ending with `; `. | yes, when scenes are allowed |
| `voiceSlop` | editor | Further `ai-slop` items ending with `; `: first person, recycled formulas, emoji, persona overuse. | yes |
| `humorTargets` | editor | A phrase extending the `humor` suggestion, e.g. ` or a verdict line`. | yes |
| `extraSuggestions` | editor | One bullet per extra suggestion category; must match `suggestions`. | yes, without extra suggestions |
| `categorySuggestion` | editor | The `category` suggestion bullet; required exactly when `categories` is set. | only without categories |
| `fieldCalibration` | editor | Calibration bullet for the profile fields (the channel's wisdom examples). | yes |
| `personaCalibration` | editor | Calibration bullet for the persona; must name `persona.name`. | only without persona |
| `hyperboleScope` | editor | The phrase listing where comic exaggeration is accepted. | no |
| `voiceRegister` | editor | Register sentence(s) before the colon rule, ending with a space. | yes |
| `hostFormatting` | editor | Bullet saying which host-printed lines are formatting. | yes |
| `contentWithoutSource` | editor | Bullet `` `contentType` <withoutSource> …``; must name that content type. | no |
| `contentWithSource` | editor | Bullet `` `contentType` <withSource> …``; must name that content type. | no |
| `categoryCalibration` | editor | Calibration bullet describing the categories. | yes, without categories |
| `sectionNames` | editor | A phrase listing the `changedSections` names, e.g. ` (hook, body)`. | yes |
| `proofreaderRole` | proofreader | The opening sentence: who the proofreader works for. | no |
| `proofreadScope` | proofreader | A phrase naming parts that must be read too, e.g. `, including dialogue`. | yes |
| `voiceProofRegister` | proofreader | The clause naming the accepted register (core continues with «, but colloquial register…»). | no |
| `proofHostFormatting` | proofreader | Sentence(s) (leading space) on host labels and capitalisation after them. | yes |
| `verifierRole` | verifier | The opening sentence naming the kind of text. | no |
| `verifierRepeatExempt` | verifier | A parenthesis of deliberate repeats that are not defects. | yes |
| `voiceVerifierScene` | verifier | `an invented narrator scene, ` when scenes are slop. | yes, when scenes are allowed |
| `voiceVerifierFirstPerson` | verifier | `, or first-person narration` when first person is slop. | yes, when first person is allowed |
| `personaDismissal` | verifier | NOT-real bullet for the persona's own opinion. | only without persona |
| `verdictContrastDismissal` | verifier | NOT-real bullet for the intended verdict-line contrast. | only without verdict lines |
| `jokeScope` | verifier | The phrase listing where an understood joke is not a defect. | no |
| `categoryDismissal` | verifier | NOT-real bullet for a loose category fit. | only without categories |
| `groundList` | verifier | The dismissal grounds after «names why:», ending with `.`; must list exactly the ground enum. | no |
| `personaAttributionGround` | verifier | `` `persona-opinion` (…) `` as a misattribution dismissal. | only without persona |
| `writerScope` | writer | Heading phrase: what the polish applies to. | no |
| `writerQuoteRule` | writer | The sentence keeping quotes with their speakers. | no |
| `voiceWriterRegister` | writer | The register sentence of the Voice item. | no |
| `voiceWriterScenes` | writer | `invented narrator scenes, ` in the banned list. | yes |
| `voiceWriterEmoji` | writer | `, emoji sprinkles` at the end of the banned list. | yes |
| `voiceWriterVocabulary` | writer | Sentence (leading space) on exaggeration and vocabulary. | yes |
| `voiceWriterSlang` | writer | Sentence (leading space) on slang and puns. | yes |
| `writerFieldsCheck` | writer | Sentence (leading space) on checking the fields on their own. | yes |
| `writerHistoryScope` | writer | Phrase extending «the whole supplied history». | yes |
| `writerVary` | writer | The list of what a new text must vary. | no |
| `writerRecovery` | writer | Sentence (leading space) with extra recovery rules. | yes |

Prose–enum agreement: the bullets under «## Suggestions» must be exactly the suggestion enum; the `` `contentType` `` names must be exactly `contentTypes`; the verifier's «names why:» list plus `confirmed` must be exactly the ground enum, and no rubric may name a ground the profile does not offer; without a persona no rubric may mention a persona; with one the editor rubric must name it.

## Profile fields and the `unique()` contract

A profile is a frozen default export of `deploy/editorial/profiles/<id>.mjs`.

| Field | Meaning |
| --- | --- |
| `id` | Lower-case id; also the file name and the fixtures directory. |
| `language` | Must be `'ru'`. |
| `persona` | `null` or `{name}`. Adds the `persona-opinion` ground (also as a misattribution dismissal). |
| `verdictLines` | `true` adds the `verdict-contrast` ground. |
| `categories` | `null` or a short description. Adds the `category` suggestion and the `loose-category` ground. |
| `suggestions` | Extra suggestion categories, inserted after `humor`: the channel has `['wisdom']`. |
| `contentTypes` | `{withSource, withoutSource}`: the editor's `contentType` for a review with or without `source`. |
| `maxChars` | Largest text in characters (code points), at most 4096. |
| `fields` | Extra editor inputs in order; sent after `candidate`. The channel has `['wisdom']`. |
| `unique(fields, history)` | Repetition check, see below. |
| `slots` | Text for every slot in the table above. |
| `hostLines` | Optional: strings the host prints in every text; the profile's fixture guard ignores them (no lines when absent). |
| `releaseBar` | Optional `{objective}` between 0.9 and 1: tightens the release bar, never loosens it. |

Enums keep the channel's order: suggestions are `humor`, the profile's `suggestions`, `style`, then `category`; grounds are `confirmed`, `correct-as-written`, `faithful-to-source`, `persona-opinion`, `verdict-contrast`, `understood-joke`, `loose-category`, `taste`, `misread`, each optional one only when declared. Blockers, the language and misattribution dismissal rules and every host rule are the same for all profiles.

`unique(fields, history)` is synchronous and returns an array of `{quote, problem, fix}`, empty when nothing repeats. The gate turns each item into a host `repetition` blocker (`by: 'host'`), which replaces the story. The channel compares the wisdom with `recentWisdoms(history)` and returns «Wisdom repeats a confirmed publication.».

A review field is missing when its key is absent or its value is `undefined`; a missing or undeclared field throws `EDITORIAL_CONFIG`.

## Caller-supplied history, hostText and source

- **`history`** (`createGate`): the confirmed publications as `[{name, text}]` with the full published text, as the caller loads them (the channel: the last 14 days of both slots). The editor and verifier receive it verbatim as a do-not-repeat list, and `unique()` reads it. It is data, never instructions.
- **`hostText`** (`review`): exact strings the host prints into the text, such as fixed labels and links. A claimed blocker whose quote occurs only inside them is dismissed as `host-formatting`.
- **`source`** (`review`): `null` for a text without evidence; its content type is `withoutSource`, and misattribution claims are dismissed as `no-evidence` (an invented quote of a real person is still `unsupported-claim`). Otherwise `{primary:{url, text, …}, supporting:[{url, text, …}], …}`. Further keys are passed to the editor unchanged; the channel adds `editionDate`, `currentDate`, `category` and `weekday`.
- **`changedSections`**: on a repair, the names of the sections edited since the last review (`sectionNames` describes them), or `null` for a full review.

## Policy and budget

- **`bounded`** (default, morning): up to two repairs per story and three stories; the ninth unsuccessful submission returns `stop` and the gate becomes terminal.
- **`persistent-evening`**: up to four repairs per story, then the story is replaced; there is no story limit, the caller's deadline ends the run.
- `review` returns the verdict with `nextAction`: `publish`, `repair`, `replace` or `stop`. `reject({text, issues, replace})` records a structural rejection on the same budget.
- `snapshot()` returns `{attempts, story, revision, abandoned}`; pass it as `initial` to continue in a later process. The last six abandoned stories are shown to the editor.
- Each reviewer gets one retry on a transport error or a malformed answer; a budget yield (`code: 'YIELD'`) is never retried. Any other failure is terminal for the gate and recorded without raw service errors.
- An approval is bound to the exact text: `assertApproved(text, verdict)` throws for any other payload.

## Size limit

A text may have at most `maxChars` characters (code points); the hard ceiling is 4096, one Telegram message. A longer text throws `EDITORIAL_CONFIG` before any request. Callers may enforce stricter limits earlier: the channel's evening caption is limited to 950 characters in `deploy/evening/compose.mjs`. Long-form texts split across requests are out of scope.

## Fixture schema and layout

| Path | Content |
| --- | --- |
| `profiles/<id>.mjs` | The profile. |
| `profiles/<id>/fixtures.json` | Development fixtures. |
| `profiles/<id>/fixtures-heldout.json` and `.sha256` | The sealed held-out set and its published hash. |
| `profiles/<id>/report.json` | The committed final evaluation report. |

The channel keeps its historical paths: `fixtures.json`, `fixtures-heldout-222.json` with `fixtures-heldout-222.sha256`, and reports under `eval-runs/`.

A fixture is `{id, class, expected, text, …}`:
- `class`: `clean`, `objective` or `borderline` (borderline is reported, never counted);
- `expected`: `approve`, `revise`, `replace` or `reject` (anything but approve);
- `categories` (or the older `dimension`) and `expectedQuote` (a regular expression): a defect counts only when one kept blocker quotes it under an expected category;
- optional `source`, `history`, `initial` (a first draft that must be sent back for repair), `injected` (the defect span, for the contamination guard) and `set` (`held-out-…`);
- `fields`: the profile fields; a missing one falls back to the fixture key of the same name, then to `text` (the channel: `wisdom || text`).

The fixture guard (`fixture-guard.mjs`) checks that no fixture sentence, injected span or expected quote appears in the profile's composed rubrics or in its callers' prompts, ignoring only the profile's own `hostLines`. `eval.mjs` refuses a contaminated profile before any request, and the production rule checks the fixtures and the revealed held-out set.

## Evaluation command and release bar

```
node deploy/editorial/eval.mjs <report.json> [id,id,...] [--final] --profile <id>
```

Without `--profile` the channel is evaluated. `PIZDATO_EVAL_TRIALS` sets the trials per fixture (default 3) and `PIZDATO_EDITOR_MODEL` the reviewer model. The held-out set joins only a `--final` run and only byte-identical to its hash. The report records `profile`, `profileSha256`, `rubricSha256` (composed rubrics and caller prompts), `bar` and `releaseBar`; a subset run reports `releaseBar: null`.

The release bar: every clean trial passes and at least 90% of objective trials are caught (more if the profile's `releaseBar` says so), in a final run with a sealed held-out set. A repository test (`productionViolations` in `eval-summary.mjs`) refuses any profile under `deploy/editorial/profiles/` other than `pizdato-channel` without fixtures and a committed final report that meets the bar for the current profile and rubrics, was run from a committed tree (`uncommitted: false`) on the current `fixtures.json` (`fixturesSha256`) and the published `fixtures-heldout.sha256` (`heldoutSha256`), and whose fixtures do not appear in the profile's composed rubrics.

## A worked minimal profile

The smallest profile has no persona, verdict lines, categories, fields or extra suggestions. `deploy/editorial/test/profiles/neutral.mjs` is the complete version, and its composed rubrics are committed under `deploy/editorial/test/profiles/neutral/`.

```js
// deploy/editorial/profiles/city-notes.mjs
export default Object.freeze({
 id:'city-notes',language:'ru',persona:null,verdictLines:false,categories:null,suggestions:[],
 contentTypes:{withSource:'sourced-note',withoutSource:'observation'},
 maxChars:2000,fields:[],unique:()=>[],
 slots:Object.freeze({
  editorRole:'You are the final Russian-language editor for a city notes column.',
  editorFields:'',
  contentWithoutSource:'- `contentType` observation needs no external source but must make literal sense.\n',
  contentWithSource:'- `contentType` sourced-note: check every reported event against the supplied evidence; never fill gaps from plausibility or memory.\n',
  groundList:'`correct-as-written` (the quoted text is correct Russian as it stands), `faithful-to-source`, `understood-joke`, `taste` or `misread`.',
  personaAttributionGround:'',
  // … every other slot of the table, '' where an empty passage is allowed
 })
});
```

Then add `profiles/city-notes/fixtures.json` and a sealed held-out set, run `eval.mjs --final --profile city-notes`, and commit the report as `profiles/city-notes/report.json`. Until the report meets the bar, the repository test fails.
