## Context

See `proposal.md` — Why section for motivation. TDD is mandated (AGENTS.md §2, §4). Unlike when Issue #69 was filed, the backend now has 41 tests (db.rs, models.rs, handlers.rs, integration). The only gap is the frontend.

Current state:
- **Backend (Rust):** 4 source files, 41 tests (db.rs: 20 via `#[sqlx::test]`, models.rs: 10, handlers.rs: 9, main.rs integration: 2). `cargo test` passes in ~0.03s. CI enforces it.
- **Frontend (React/TS + Vite):** 25 source files. No test framework. `package.json` has no `test` script. Vite 5.4 is the build tool.
- **CI:** Runs `cargo test` (passes). No frontend test step.

This change focuses exclusively on closing the frontend gap.

## Goals / Non-Goals

**Goals:**
- Install frontend test framework (vitest + jsdom + @testing-library/react)
- 1 smoke test for pure functions (`share.ts` — `buildShareText`)
- 1 smoke test for API client (`api.ts` — `fetchStats` with mocked fetch)
- 1 component render test (`App.tsx` — renders without crash)
- Add `npm test` to CI workflow so it gates PRs

**Non-Goals:**
- Comprehensive frontend coverage (80%+) — deferred
- E2E tests (Playwright/Cypress) — deferred until MVP stabilizes
- Visual regression / snapshot testing (badge canvas)
- Backend test additions — backend already meets the TDD mandate
- Coverage reporting in CI — can be added later

## Decisions

1. **Frontend test framework: vitest + @testing-library/react + jsdom**
   - Vite is already the build tool — vitest shares its config/transform pipeline with zero extra setup.
   - @testing-library/react encourages testing behavior over implementation details.
   - jsdom provides DOM APIs without a real browser (fast for unit/smoke tests).
   - Alternatives considered:
     - Jest: separate config, slower startup, different transform pipeline. Rejected.
     - Playwright: overkill for unit/smoke tests, add E2E later. Deferred.

2. **First frontend tests to write (minimal baseline):**
   - **share.ts:** Test `buildShareText()` returns expected strings for both `Choice` variants. Pure function — no dependencies, trivial to test.
   - **api.ts:** Mock `global.fetch` via vitest spies. Test `fetchStats()` constructs correct URL and parses JSON response. Covers error handling (network failure, non-OK status).
   - **App.tsx:** Render `<App />` with @testing-library/react, verify no crash (basic DOM assertion — heading text or root element exists). Tests that component tree mounts without throwing.

3. **CI integration:**
   - Add step: `cd frontend && npm ci && npm test` to the existing workflow (`.github/workflows/`).
   - Runs after build, before deploy. Both `cargo test` and `npm test` must pass.

## Risks / Trade-offs

- **jsdom vs real browser:** jsdom doesn't implement canvas or ResizeObserver. If component tests touch canvas (badge.ts), they need stubs. Mitigation: initial smoke tests avoid canvas-heavy components.
- **API test flakiness:** `api.ts` tests mock `fetch` — no real network calls, so no flakiness from that source.
- **Frontend CI time:** vitest is fast (~1-2s for 3 tests). Initial suite adds negligible CI time.