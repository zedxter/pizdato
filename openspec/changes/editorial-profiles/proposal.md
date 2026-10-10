## Why

The editorial gate is generic in its flow but can only review @pizdato_net posts. The channel's name, Uncle Misha, its fixed lines, weekday categories, the `wisdom` field and two content types are written into the rubrics and `gate.mjs`. The owner wants to reuse the gate for other posts and stories without forking it, so that recall work such as #225 benefits every publication. Issue #226.

## What Changes

- **Publication profile.** A profile is a module under `deploy/editorial/profiles/`. It defines:
  - an id and a language;
  - an optional persona, verdict lines and categories;
  - extra suggestion categories and its content types;
  - a maximum length of at most 4096 characters;
  - extra editor fields with their repetition check;
  - the text for every rubric slot, including the voice rules (first person, invented scenes, register).
- **Rubric templates.** The rubrics become `*.template.md` core templates with whole-sentence `{{slot}}` placeholders. A profile is validated up front, at construction and in `--check`. Missing, unused or leftover slots, and prose that disagrees with the enums, fail with `EDITORIAL_CONFIG`; this error never consumes a story.
- **Gate API.**
  - `createGate({profile, …})` requires a profile.
  - `review({text, source, fields})` replaces the channel-specific `wisdom` argument.
  - `reviewOptions(profile)` replaces the module-level schemas; the channel instances stay exported.
  - The grounds `persona-opinion`, `verdict-contrast` and `loose-category` and the suggestions `wisdom` and `category` exist only when the profile declares them.
- **`pizdato-channel` profile.** It reproduces da0b2ed byte for byte: composed rubrics, requests, decisions and preflight. Goldens captured from a da0b2ed worktree pin this.
- **Test profiles.** A neutral profile proves that no channel text remains in the core and passes a readability lint. A structurally different column or story example runs the whole flow.
- **Callers.** The evening agent, worker and network and the morning agent pass the channel profile and read the composed writer polish.
- **Evaluation harness.** `--profile`, per-profile fixtures and release bar, a contamination check over composed rubrics, composed-rubric provenance, and a repository test that refuses an unevaluated production profile.
- **Documentation.** `docs/editorial-profiles.md` explains how to add a publication.

## Capabilities

### New Capabilities
- `editorial-profiles`: publication profiles for the editorial gate.

### Modified Capabilities
None. Channel behaviour is unchanged by construction.

## Impact

- **Code:** `deploy/editorial/{gate,eval,eval-summary,fixture-guard}.mjs`, the rubric templates, the new `deploy/editorial/profiles/` and `deploy/editorial/compose-rubric.mjs`, plus goldens and tests.
- **Callers:** `deploy/evening/{agent,worker,network}.mjs` and `deploy/morning/agent.mjs`, changed where they construct the gate, read the polish, run `--check` or handle configuration errors.
- **Not affected:** providers, models, schedules, credentials, caps and deadlines.
