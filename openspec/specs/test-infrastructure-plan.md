# Spec: Test Infrastructure Plan for pizdato.net

**Issue:** #69
**Status:** Draft (plan only, no implementation)

## Problem

The project AGENTS.md mandates TDD: "No production code without a failing test first." The codebase lacks comprehensive test coverage:

- **Backend (Rust):** 9 unit tests exist for event handlers only. Core DB operations (vote casting, rate limiting, session management) have zero tests. No integration tests.
- **Frontend (React/TS):** No test framework installed. No `test` script in `package.json`. Zero tests for any component or utility.

## Proposed Test Framework

### Backend (Rust) — already using `#[cfg(test)]` + built-in test runner

The existing test setup works. No new framework needed. Expand coverage:

| Area | What to test | Priority |
|------|-------------|----------|
| DB operations | `insert_vote()`, vote counts, session read/write | P0 |
| Rate limiting | IP-based vote limits, event rate limits | P0 |
| SQL queries | Compile-time verification, raw SQL audit | P1 |
| Integration | Server startup → `/health`, `/api/stats`, full vote flow | P1 |

### Frontend (React/TS) — needs new framework

**Recommendation: Vitest**

- Zero-config with Vite (already used for dev/build)
- Fast, Jest-compatible API, native ESM/TypeScript
- `jsdom` for DOM simulation, `@testing-library/react` for component tests

**Installation:**
```
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Initial `package.json` addition:**
```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```

**Vitest config** — add to `vite.config.ts` or a separate `vitest.config.ts`:
```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
```

## What to Test First (Priority Order)

### P0 — Core business logic

1. **`share.ts`** — `buildShareText()`, `telegramShareUrl()`, `vkShareUrl()`, `xShareUrl()`, `copyShareText()`, `nativeShare()` — pure functions, easy to test
2. **`api.ts`** — `fetchStats()`, `castVote()` — mock fetch, verify URL construction and error handling
3. **`badge.ts`** — `renderBadgeCanvas()` — verify canvas dimensions, text rendering (smoke test)

### P1 — Component smoke tests

1. **`SharePanel.tsx`** — renders all share buttons, clicking fires tracking
2. **`App.tsx`** — basic render without crash, vote flow
3. **`Feed.tsx`**, `Faq.tsx`, `Articles.tsx` — render smoke tests

### P2 — Visual regression

1. Badge canvas rendering — compare PNG snapshots or pixel-match
2. Component layout — match design tokens

## CI Integration Plan

1. **Backend tests** — already run via `cargo test` in CI (verify existing workflow)
2. **Frontend tests** — add `npm test` step to CI workflow:
   ```yaml
   - name: Run frontend tests
     working-directory: ./frontend
     run: npm test
   ```
3. **PR gate** — failing tests block merge (already enforced by CI)
4. **Coverage** — add `cargo-tarpaulin` (Rust) and `vitest --coverage` (frontend) as optional metrics, not gates

## Out of Scope

- E2E tests (Playwright/Cypress) — deferred until MVP stabilizes
- Fuzz/property-based testing — future consideration
- Load testing — separate initiative

## Acceptance Criteria for This Spec

1. Spec is reviewed and approved by Geralt (CTO) and Yennefer (PM)
2. Implementation PRs are created from this plan, not this PR
3. Test coverage baseline is established before any new production code is merged
