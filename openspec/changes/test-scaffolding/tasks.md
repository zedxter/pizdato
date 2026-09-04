## 1. Frontend Test Setup

- [ ] 1.1 Install dependencies: `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom`
- [ ] 1.2 Add `test` and `test:watch` scripts to `frontend/package.json`
- [ ] 1.3 Add vitest configuration to `frontend/vite.config.ts` (jsdom environment, globals: true, setup file path)
- [ ] 1.4 Create `frontend/src/test/setup.ts` — import `@testing-library/jest-dom` for matchers like `toBeInTheDocument()`

## 2. Frontend Smoke Tests (pure functions)

- [ ] 2.1 Create `frontend/src/__tests__/share.test.ts` — test `buildShareText()` returns expected strings for both `Choice` variants (idempotency, non-empty)
- [ ] 2.2 Create `frontend/src/__tests__/api.test.ts` — mock `global.fetch`, test `fetchStats()` constructs correct URL and handles errors

## 3. Frontend Component Smoke Test

- [ ] 3.1 Create `frontend/src/__tests__/App.test.tsx` — render `<App />` with @testing-library/react, verify no crash (basic existence assertion on root element or heading)

## 4. CI Integration

- [ ] 4.1 Add `npm ci && npm test` step to CI workflow (`.github/workflows/*.yml`) for the frontend directory
- [ ] 4.2 Verify `npm test` passes and CI enforces frontend tests as PR gate

## 5. Documentation

- [ ] 5.1 Update `AGENTS.md` to clarify the minimum baseline: "Every PR that adds or modifies frontend code MUST include or update corresponding tests. Pure function changes need unit tests; component changes need render smoke tests."