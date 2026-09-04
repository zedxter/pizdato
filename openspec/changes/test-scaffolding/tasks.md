## 1. Backend Unit Tests (db.rs)

- [ ] 1.1 Add `#[cfg(test)] mod tests` block to `backend/src/db.rs` with a helper that creates an in-memory SQLite pool and runs migrations/schema init
- [ ] 1.2 Write test: `init_db_creates_tables` — verify that `init_db(":memory:")` returns `Ok` and the pool works
- [ ] 1.3 Write test: `get_counts_returns_zero_for_empty_db` — call `get_counts()`, assert both `pizdato` and `huyevo` counts are 0
- [ ] 1.4 Write test: `insert_vote_persists_vote` — insert a vote via sqlx query directly, verify `get_counts()` returns correct totals

## 2. Backend Integration Test

- [ ] 2.1 Create `backend/tests/api.rs` with a helper that builds and starts the server on random port (using `axum::Router` directly — bypass main.rs which reads env)
- [ ] 2.2 Write test: `health_endpoint_returns_200` — spawn server, `GET /health`, assert 200 OK and expected JSON shape
- [ ] 2.3 Write test: `stats_endpoint_returns_zero_counts` — `GET /api/stats`, assert counts are 0 (empty DB)

## 3. Frontend Test Setup

- [ ] 3.1 Install dependencies: `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom`
- [ ] 3.2 Add `test` and `test:watch` scripts to `frontend/package.json`
- [ ] 3.3 Add vitest configuration to `frontend/vite.config.ts` (jsdom environment, globals: true, setup file)
- [ ] 3.4 Create `frontend/src/test/setup.ts` — import `@testing-library/jest-dom` for matchers like `toBeInTheDocument()`

## 4. Frontend Smoke Tests (pure functions)

- [ ] 4.1 Create `frontend/src/__tests__/share.test.ts` — test `buildShareText()` returns expected strings for both vote types (idempotency and non-empty)
- [ ] 4.2 Create `frontend/src/__tests__/api.test.ts` — mock `global.fetch`, test that `fetchStats()` constructs correct URL and parses response

## 5. Frontend Component Smoke Test

- [ ] 5.1 Create `frontend/src/__tests__/App.test.tsx` — render `<App />` with @testing-library/react, verify no crash (basic existence assertion on root element)

## 6. CI Integration

- [ ] 6.1 Add npm install + npm test step to CI workflow (`.github/workflows/*.yml`) in the frontend directory
- [ ] 6.2 Verify that `cargo test` and `npm test` both pass and that CI enforces them as PR gates

## 7. Documentation

- [ ] 7.1 Update `AGENTS.md` to clarify: "At minimum, every PR that adds or modifies code MUST include or update corresponding tests. Pure function changes need unit tests; component changes need render smoke tests."