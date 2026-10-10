# Spec review — editorial-profiles (#226, PR #227)

Five independent agent reviews of the first spec revision (2026-10-10). All five returned **needs-changes**. Resolutions are folded into `design.md`, `spec.md`, `tasks.md`, the proposal and the IDD.

| # | Lens | Finding | Severity | Resolution |
| --- | --- | --- | --- | --- |
| 1 | architecture, prompts, product | `wisdom`/`category` suggestions and `loose-category` ground stay core; contradicts the neutral-profile criterion | blocker | Profile-dependent suggestion and ground enums, channel order preserved (design 3; spec "Profile-dependent suggestions and grounds") |
| 2 | architecture, equivalence, reliability | Module-level option constants used by callers and tests by identity | major | `reviewOptions(profile)`, memoized; channel instances stay exported; `network.check` uses profile options (design 4) |
| 3 | architecture, reliability | Composition errors surface mid-review, consume stories, logged as reviewer failures; unused-slot check impossible per template | major | `validateProfile` over all four templates at construction and `--check`; `EDITORIAL_CONFIG` never consumes a story (design 1; spec "Configuration errors do not consume stories") |
| 4 | reliability | `--check` does not compose rubrics | major | Every `--check` path composes and validates; Rust/morning tests on a broken profile |
| 5 | architecture, equivalence, reliability | Fixture guard and eval provenance would hash templates, not prompts | major | Guard over composed rubrics per profile; reports record profile and composed hashes; slot-seeding test (design 8) |
| 6 | architecture, prompts | Persona/ground prose can contradict enums | major | Prose–enum agreement check in validation (design 3; spec "Prose and enums agree") |
| 7 | equivalence | Deep-equal does not prove byte identity (key order, `undefined`) | major | Goldens are exact serialized strings, compared with `assert.equal` (design 7) |
| 8 | equivalence | Goldens pin requests, not decisions; existing tests will be edited | major | Goldens also record verdicts, record entries and snapshots; ten cases incl. retry, allow-list, host-owned, no-evidence, repetition, replace, preflight |
| 9 | equivalence | Writer polish read at three call sites; a stale read would leak placeholders | major | Templates renamed `*.template.md`; one composer used by all callers; test per caller |
| 10 | equivalence | Golden capture not reproducible; baseline drift | major | Capture from a da0b2ed worktree via the old API with provenance assertions; baseline-diff guard; pinned sha256 values |
| 11 | prompts | Core voice rules (no first person, no invented scenes, colloquial register) forbid stories | major | Voice rules move to a profile `voice` slot; scope states short stories and columns (design 2; IDD) |
| 12 | prompts | Mid-sentence channel content; neutral readability unchecked | major | Whole-sentence slots; neutral snapshots committed; readability lint |
| 13 | prompts | No slot inventory | major | Binding table in design Context; slot table in docs checked by a test |
| 14 | product | Harness stays channel-shaped | major | `--profile`, per-profile fixtures, held-out and bar (design 8) |
| 15 | product | "Stories" undefined | major | Short-form ≤ 4096 characters; long-form follow-up; owner decision 3 |
| 16 | product | No real second consumer validates the slots | major | `example-column` test profile runs the full flow (design 9) |
| 17 | product | "Own evaluation" unenforceable; bar open | minor | Repository test; default bar = channel's; may tighten, not loosen |
| 18 | product | Docs criterion vague | minor | Required sections listed; slot-table test |
| 19 | architecture | `persistent-evening` rename is churn | minor | Dropped |
| 20 | architecture, prompts | Further couplings (no-evidence comment, `recentWisdoms`, host lines, decorative `language`) | minor | Table rows; generic comment with rationale; `language==='ru'` validated; host lines stay caller-owned |
| 21 | equivalence | Request ordering and retry not pinned | minor | Requests keyed by title and sequence; retry golden case |
| 22 | equivalence | "Missing field" undefined | minor | Defined; current callers always pass strings |
| 23 | reliability | Rollback underspecified; "rubric-only rollback" wrong | minor | Exact steps; sentence removed; no state migration |
| 24 | reliability | Scenarios not mapped to tests | minor | Scenario-to-file map in tasks 2.2 |
| 25 | reliability | Installer coverage; neutral profile location | minor | Test profiles under `test/` (not installed); install test asserts profile and composer; entrypoints import the channel profile directly |

Not adopted: generating all persona and ground prose from structured fields. The prose–enum agreement check reaches the same safety while keeping the channel bytes in the profile.
