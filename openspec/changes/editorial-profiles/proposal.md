## Why

The editorial gate is generic in its flow but can only review @pizdato_net posts. The channel's name, Uncle Misha, its fixed lines, weekday categories, the `wisdom` field and two content types are written into the rubrics and `gate.mjs`. The owner wants to reuse the gate for other posts and stories without forking it, so that recall work such as #225 benefits every publication. Issue #226.

## What Changes

- **Publication profile.** A profile is a module under `deploy/editorial/profiles/`. It defines:
  - an id and a language;
  - an optional persona;
  - verdict lines, if any, and fixed host lines;
  - its content types;
  - extra editor fields, and the fields that must not repeat history;
  - the text for every rubric slot.
- **Rubric templates.** `editor.md`, `proofreader.md`, `verifier.md` and `writer.md` become core templates with `{{slot}}` placeholders. Composition is strict: a missing slot, an unknown slot or a leftover placeholder throws.
- **Gate API.**
  - `createGate({profile, …})` requires a profile.
  - `review({text, source, fields})` replaces the channel-specific `wisdom` argument.
  - The dismissal grounds `persona-opinion` and `verdict-contrast` exist only when the profile declares a persona or verdict lines.
- **`pizdato-channel` profile.** It reproduces da0b2ed byte for byte: composed rubrics, user messages, schemas and titles. Tests pin this.
- **Neutral test profile.** It proves that no channel text remains in the core.
- **Callers.** The evening agent, worker and network and the morning agent pass the channel profile and read the composed writer polish.
- **Evaluation harness.** Fixtures carry a profile id, defaulting to `pizdato-channel`.
- **Documentation.** `docs/editorial-profiles.md` explains how to add a publication.

## Capabilities

### New Capabilities
- `editorial-profiles`: publication profiles for the editorial gate.

### Modified Capabilities
None. Channel behaviour is unchanged by construction.

## Impact

- **Code:** `deploy/editorial/gate.mjs`, the rubric files, the new `deploy/editorial/profiles/` and `deploy/editorial/compose-rubric.mjs`, plus tests.
- **Callers:** `deploy/evening/{agent,worker,network}.mjs` and `deploy/morning/agent.mjs`, changed only where they construct the gate or read the polish.
- **Not affected:** providers, models, schedules, credentials, caps and deadlines.
