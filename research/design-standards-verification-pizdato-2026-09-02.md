# Design-Process-Standards Verification — pizdato.net

**Date:** 2026-09-02
**Author:** Vesemir (QA)
**Issue:** #23

## Verification Results

### 1. DESIGN.md (linted, anti-patterns)

| Criteria | Status |
|----------|--------|
| File exists at repo root | ✅ YES (`/DESIGN.md`) |
| Version | alpha, 309 lines |
| Design tokens defined | ✅ Colors, typography, spacing, border-radius, shadows, content-max-width |
| Anti-patterns documented | ✅ WhiteSpace, IconOverload, GradientOverkill, ShadowFlood |
| Linted (0 errors) | ❌ **No linter exists** — no DESIGN.md validation script or CI check |

**Finding:** DESIGN.md is comprehensive but has no automated linting/validation. Missing a linter check in CI.

---

### 2. Stylesheet (design.css)

| Criteria | Status |
|----------|--------|
| File exists at repo root | ✅ YES (`/design.css`), 490 lines |
| Content-Type text/css at URL | ❌ **404 Not Found** at `https://pizdato.net/design.css` |
| CORS configured | ⏳ **Just added** in PR #38 (Caddyfile `Access-Control-Allow-Origin: *`) |
| Caching headers | ❌ Not configured |

**Finding:** `design.css` exists in the repo root but is not included in the Docker build (Dockerfile only copies `frontend/dist`). The deploy pipeline copies `deploy/Caddyfile` but `design.css` is not in deploy directory. **The stylesheet cannot reach production until it's included in the build or deployed separately.**

Root cause: the deploy.yml copies `deploy/deploy.sh,deploy/compose.yaml,deploy/Caddyfile` only. The `design.css` at repo root is never sent to VPS.

---

### 3. Eval scenarios (>=1 PASS)

| Criteria | Status |
|----------|--------|
| Eval files exist | ✅ 3 YAML files: `design-evals/home.yaml`, `feed.yaml`, `article.yaml` |
| Eval runner/executor | ❌ **No runner found** — no script, binary, or npm task executes these YAML specs |
| At least 1 PASS | ❌ Cannot verify — no executable test harness |

**Finding:** Eval scenarios are well-structured YAML spec files but have no runner. They validate CSS properties against selectors but there's no mechanism to actually perform the checks. Consider implementing a `ui-pixel-validation` runner or converting to Playwright/Storybook tests.

---

### 4. ui-pixel-validation

| Criteria | Status |
|----------|--------|
| Script/tool exists | ❌ **Not found** anywhere in the repo |
| Passes on key pages | ❌ N/A — tool doesn't exist |

**Finding:** No pixel validation tool or configuration exists in the repository. This is a complete gap.

---

### 5. Design gate in product-standards.md

| Criteria | Status |
|----------|--------|
| `product-standards.md` exists at repo root | ❌ **Not found** |
| OpenSpec change exists | ✅ `openspec/changes/add-product-standards/` — proposal, design, tasks, spec |
| OpenSpec change implemented | ❌ **Not merged** — spec-PR not created/merged; `product-standards.md` never created |

**Finding:** The `add-product-standards` OpenSpec change exists as a proposal but was never implemented (no spec-PR merged, no file created). The team `projects/product-standards.md` may exist elsewhere but the repo-level file is missing.

---

## Summary

| Item | Status |
|------|--------|
| DESIGN.md (linted, anti-patterns) | ⚠️ File exists but NOT linted |
| Stylesheet (URL, CORS, Caching) | ❌ Not published (404), CORS just added, no caching |
| Eval scenarios (>=1 PASS) | ⚠️ Specs exist but NO runner |
| ui-pixel-validation | ❌ Not implemented |
| Design gate in product-standards.md | ❌ Not implemented |

## Sub-issues Required

1. **#27** — `ops: include design.css in Docker build and deploy` — design.css must be copied into the Docker image or deploy assets so it's served from pizdato.net/design.css
2. **#28** — `feat: implement design-eval runner for CSS property verification` — Build/select a tool that executes the YAML eval scenarios against the live page
3. **#29** — `feat: implement product-standards.md for pizdato.net` — Complete the OpenSpec `add-product-standards` change
4. **#30** — `feat: implement ui-pixel-validation for key pages` — Add pixel-perfect visual comparison tests
5. **#31** — `ops: add DESIGN.md linter CI check` — Add automated validation for DESIGN.md format and completeness