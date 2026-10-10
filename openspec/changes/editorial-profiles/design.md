## Context

`gate.mjs` already separates mechanics from judgement. The channel-specific parts form a short list:

| Where | Channel-specific part |
| --- | --- |
| `editor.md` | Channel description; fixed lines and morning emojis; Uncle Misha calibration; weekday categories; content-type paragraphs; revision section names (hook, body, pizdato, huevo, wisdom); wisdom calibration examples |
| `proofreader.md` | Channel name; brand profanity; fixed labels and capitalisation after them |
| `verifier.md` | Uncle Misha dismissal; verdict-contrast dismissal; Uncle Misha in the misattribution grounds; weekday categories |
| `writer.md` | Uncle Misha in facts; «Read the wisdom and the wish»; beverage-ritual recovery note; history across both slots |
| `gate.mjs` | `wisdom` argument and repetition check; content-type names; `persona-opinion` and `verdict-contrast` grounds; `persistent-evening` policy name |

## Goals / Non-Goals

**Goals:**
- One core that any Russian-language publication can use through a profile.
- Zero behaviour change for the channel, proven by byte-identical requests.

**Non-Goals:**
- Recall changes (#225).
- Other languages.
- Long-form texts split across requests.
- Moving history loading and delivery, which stay with the caller.
- A second production profile.

## Decisions

### 1. Templates with slots, composed at review time
Each core rubric keeps its text and replaces the channel passages with `{{slot}}` placeholders. A slot owns its surrounding whitespace and bullet markup, so an empty slot leaves no blank bullet. `composeRubric(name, profile)`:

1. reads the template;
2. replaces every `{{name}}` with `profile.slots[name]`;
3. throws on a placeholder without a slot, a slot that no template uses, or any leftover `{{`.

Rubrics are still read on every review, so a rubric-only rollback still takes effect on the next tick.

*Alternative:* plain core rubrics with an appended profile section. It is cleaner to read, but it changes the prompts and would require a full LLM evaluation to show no regression. A later change can still reorganise the templates, with an evaluation, once more profiles exist.

### 2. The profile is a plain ES module
`profiles/pizdato-channel.mjs` exports a frozen object:

- `id`, `language`;
- `persona` (`null` or `{name}`) and `verdictLines` (boolean);
- `contentTypes: {withSource, withoutSource}`;
- `fields` (extra editor input keys, in order);
- `unique(fields, history)`: host repetition findings;
- `slots`.

The channel's `unique` keeps `recentWisdoms` and its exact finding text. Code, not JSON, because `unique` is a function and the slot text needs no escaping.

### 3. Grounds depend on the profile
`GROUNDS` and `ATTRIBUTION_DISMISSAL` are built from the core list:

- `persona-opinion` is added only when `persona` is set;
- `verdict-contrast` is added only when `verdictLines` is true.

For the channel the enum keeps the current order, so the schema stays byte-identical. A verifier answer that uses a ground the profile does not allow fails schema validation, and the existing retry handles it.

### 4. Gate input
`review({text, source, fields={}, changedSections, hostText})`:

- the editor message is `{contentType, candidate, ...fields in profile order, history, source, current, …}`, which reproduces today's key order for `fields: {wisdom}`;
- unknown or missing declared fields throw.

The `wisdom` argument goes away, and callers pass `fields: {wisdom}`. `policy: 'persistent-evening'` becomes `policy: 'persistent'`, an internal rename covered by tests.

### 5. Titles stay core constants
`pizdato-editor`, `pizdato-proofreader` and `pizdato-verifier` are infrastructure labels: they route reasoning effort in `agent.mjs` and name OpenRouter traffic. They are not publication content. Renaming them would change requests, so they stay, and the channel-term check excludes request titles.

### 6. Proof of equivalence
Golden tests run the gate with a recording fake `request` on four inputs:

- morning observation;
- evening first review with source;
- evening revision with `changedSections`;
- a verifier round.

They compare every recorded `messages` and `options` value deep-equal to fixtures captured from da0b2ed. The capture script is committed and is run once on da0b2ed. Each composed rubric's sha256 must equal the da0b2ed file's sha256. The writer polish composed for the channel must equal the da0b2ed `writer.md`.

## Risks / Trade-offs

- **Templates may be awkward to read.** Mitigation: a slot table in `docs/editorial-profiles.md` and slot names that say what they hold.
- **The core still carries the channel's examples.** Some generic examples were written for the channel; they are generic Russian and stay. The neutral profile test catches any leftover channel term.
- **A new profile is unmeasured.** A profile is production-ready only with its own fixtures and evaluation, as `docs/editorial-profiles.md` requires.

## Migration Plan

1. Capture golden requests on da0b2ed.
2. Change the gate, rubrics and callers under TDD.
3. Run CI, review and merge.
4. Install, run `--check` and one dry run per slot.

Rollback: restore the installer backup links.
