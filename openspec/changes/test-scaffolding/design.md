## Context

See `proposal.md` — Why section for motivation. The issue is clear: TDD is mandated (AGENTS.md §2, §4), and near-zero test coverage means the mandate is violated on every commit.

Current state:
- **Backend:** Rust (Axum) with SQLite via sqlx. 4 source files. 9 unit tests inline in `handlers.rs` for event rate limiting only. No `tests/` directory. No `[dev-dependencies]`. `cargo test` runs in ~0.00s for the 9 tests.
- **Frontend:** React 18 + TypeScript + Vite. 25 source files (TSX/TS). No test framework. `package.json` has no `test` script. Vite 5.4 is the build tool.
- **CI:** Current workflow runs `cargo test` (passes trivially with 9 tests). No frontend test step.

## Goals / Non-Goals

**Goals:**
- Establish a minimal test baseline that makes `cargo test` and `npm test` meaningful PR gates
- Backend: db.rs smoke tests (vote CRUD, session read/write) + 1 integration test (server starts, `/health` responds)
- Frontend: install vitest + jsdom + @testing-library/react; 1 smoke test for pure functions (share.ts), 1 component smoke test (App.tsx renders without crash)
- CI: add frontend test step that runs on every PR

**Non-Goals:**
- Comprehensive coverage (80%+ line coverage) — deferred to follow-up issues
- E2E tests (Playwright/Cypress) — deferred until MVP stabilizes
- Property-based or fuzz testing
- Snapshot/visual regression testing (badge canvas)
- Coverage reporting in CI (can be added later as optional step)

## Decisions

1. **Backend test strategy: Rust built-in `#[cfg(test)]` + `tests/` directory**
   - No new framework needed. Rust's built-in test runner is sufficient for unit and integration tests.
   - Integration tests go in `backend/tests/` (standard Cargo convention) — these are compiled as separate crates and test the public API via HTTP.
   - Unit tests go in `#[cfg(test)] mod tests { ... }` at the bottom of each source file, testing internal functions directly.

2. **Frontend test framework: vitest + @testing-library/react + jsdom**
   - Vite is already the build tool — vitest is zero-config and shares the Vite config/transform pipeline.
   - @testing-library/react encourages testing behavior over implementation details (the right approach for smoke tests).
   - jsdom provides DOM APIs without a real browser (fast for unit/smoke tests).
   - Alternatives considered:
     - Jest: would need separate config, slower startup. Rejected.
     - Playwright: better for E2E, overkill for unit/smoke tests. Deferred.

3. **First tests to write (minimal baseline):**
   - **Backend db.rs:** Test `init_db()`, `get_counts()`, vote insert (happy path). Use in-memory SQLite (`sqlx::SqlitePool::connect_lazy(":memory:")` with a synchronous schema init) — or a temp file. The existing `db.rs` uses a file path from env; for tests we override with `:memory:`.
   - **Backend integration:** One test in `tests/api.rs`: spawn server on random port, hit `GET /health`, assert 200 + body shape.
   - **Frontend share.ts:** Test `buildShareText()` returns expected text for vote type constants.
   - **Frontend App.tsx:** Test that `App` renders without throwing. Basic DOM assertion (page title or heading text).

4. **CI integration:**
   - Backend test step already exists (`cargo test`). Verify it works.
   - Add frontend step: `cd frontend && npm ci && npm test` after the build step.
   - Both steps must pass before PR merge.

## Risks / Trade-offs

- **SQLite `:memory:` in tests:** Works for most operations but may not surface filesystem-related bugs. Mitigation: this is a smoke baseline — not a full coverage suite.
- **jsdom vs real browser:** jsdom doesn't implement every DOM API (e.g., canvas, ResizeObserver). If component tests rely on canvas rendering, they may need a jsdom stub or skip. Mitigation: initial smoke tests avoid canvas-heavy components (badge.ts is deferred).
- **Frontend test speed:** vitest is fast, but a growing test suite may slow CI. Mitigation: initial suite is 2 tests; any slowdown is a future problem.
- **Flaky tests from async/network:** API client tests (`api.ts`) fetch real endpoints. Mitigation: mock `fetch` in vitest tests — no real network calls.