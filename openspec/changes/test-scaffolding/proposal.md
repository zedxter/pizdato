## Why

The project's AGENTS.md mandates TDD: "No production code without a failing test first." The backend already has 41 tests (db.rs, models.rs, handlers.rs, integration) — the TDD requirement is largely met there. However, the frontend (React/TS) has zero test coverage: no test framework installed, no `test` script in `package.json`, zero tests for any of the 25 source files. Without frontend tests, the TDD mandate is half-violated and CI has no regression safety net for UI changes.

## What Changes

- **Frontend:** Install vitest + testing-library + jsdom. Add smoke tests for pure functions (`share.ts`, `api.ts`) and a component render test (`App.tsx`).
- **CI:** Add frontend `npm test` step to enforce frontend tests as a PR gate.
- **Documentation:** Update `AGENTS.md` to clarify the minimum test baseline (frontend smoke tests required per PR).

**Backend:** No changes needed — 41 existing tests (db.rs: 20, models.rs: 10, handlers.rs: 9, main.rs-integration: 2) already satisfy the TDD mandate. `cargo test` passes and is enforced in CI.

## Capabilities

This change introduces no new product capabilities and modifies no existing spec-level behavior. It is pure tooling/infrastructure (test scaffolding). `skip_specs: true` is set in `.openspec.yaml`.

## Impact

- `frontend/package.json` — add vitest, @testing-library/react, @testing-library/jest-dom, jsdom as devDependencies; add `test` and `test:watch` scripts
- `frontend/vite.config.ts` — add vitest configuration (jsdom environment, globals: true, setup file)
- `frontend/src/test/setup.ts` — new setup file for @testing-library/jest-dom matchers
- `frontend/src/__tests__/` — new test directory with smoke tests
- `.github/workflows/` — add frontend test step to CI
- `AGENTS.md` — clarify minimum test expectations for frontend changes