## Why

The project's AGENTS.md mandates TDD: "No production code without a failing test first." Currently the codebase has near-zero test coverage:

- **Backend (Rust):** 9 unit tests for event rate limiting only (inline in `handlers.rs`). Core DB operations (vote casting, session management, stats) and HTTP handler logic have zero coverage. No `tests/` integration directory.
- **Frontend (React/TS):** No test framework installed. No `test` script in `package.json`. Zero tests for any component, utility, or API client.

This violates the project's own process rules and means every change risks regressions with no automated safety net. Issue #69 tracks this gap.

## What Changes

- **Backend:** Add `#[cfg(test)]` unit tests for `db.rs` (vote operations, session CRUD) and integration tests in `tests/` directory (server startup → `/health` endpoint, vote flow).
- **Frontend:** Install vitest + testing-library. Add smoke tests for key pure functions (`share.ts`, `api.ts`) and a component render test (`SharePanel`, `App`).
- **CI:** Add frontend `npm test` step to CI workflow to enforce the new tests as a PR gate.
- **Documentation:** Update `AGENTS.md` to clarify the minimum test baseline (smoke tests required per PR for new code).

This is a pure tooling/infrastructure change — no product behavior or user-facing features are added. The test-infrastructure-plan.md draft in `openspec/specs/` already contains the detailed proposed framework choices.

## Capabilities

This change introduces no new product capabilities and modifies no existing spec-level behavior. It is pure tooling/infrastructure (test scaffolding). `skip_specs: true` is set in `.openspec.yaml`.

## Impact

- `backend/Cargo.toml` — no new dependencies needed (Rust built-in test runner)
- `frontend/package.json` — add vitest, @testing-library/react, jsdom as devDependencies; add `test` and `test:watch` scripts
- `frontend/vite.config.ts` — add vitest configuration (jsdom environment)
- `frontend/src/` — new `__tests__/` directory with smoke tests
- `backend/src/` — new `#[cfg(test)]` modules in `db.rs`; new `tests/` dir for integration tests
- `.github/workflows/` — add frontend test step to CI
- `AGENTS.md` — clarify minimum test expectations