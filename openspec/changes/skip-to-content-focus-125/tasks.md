# Tasks — Skip-to-content + :focus-visible

All estimates assume the repo and DESIGN.md are open.

## T1: Add `:focus-visible` rule to design.css

- File: `frontend/public/design.css`
- Add after the `.btn:not(:disabled):active` block (line ~386)
- Rule: `:focus-visible { outline: 2px solid var(--color-tertiary); outline-offset: 2px; }`
- Estimation: 5 min

## T2: Add `id="main-content"` to hero section in App.tsx

- File: `frontend/src/App.tsx`
- Find `<section className="hero">` and add `id="main-content"`
- Estimation: 3 min

## T3: Add skip-to-content link in SiteNav.tsx

- File: `frontend/src/SiteNav.tsx`
- Add `<a className="skip-link" href="#main-content">Skip to content</a>` as the first element in the fragment (before the anchor div)
- Add `.skip-link` CSS in design.css (absolute offscreen → on-focus visible)
- Estimation: 10 min

## T4: Document focus-ring in DESIGN.md

- File: `DESIGN.md`
- Add `focus-ring` component token under Components section
- Estimation: 5 min

---

**Total:** ~23 min