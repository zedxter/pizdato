## Why

Issue #125: pizdato.net lacks keyboard navigation affordances beyond browser defaults:

1. No skip-to-content link — keyboard users tab through the full SiteNav (brand mark, nav links, toggle button) before reaching main content on every page.
2. No custom `:focus-visible` styling — interactive elements (`.essay-back`, `.articles-item-link`, inline links, FAQ items) have hover states but zero focus feedback that matches the design language. In the dark/neon design system, keyboard focus is invisible.

## What Changes

1. **SiteNav.tsx** — add a visually-hidden skip-to-content link as the first focusable element. Pattern: `left: -999px; position: absolute;` → on `:focus` move to `left: 0`.
2. **design.css** — add a single `:focus-visible` global rule: `2px solid var(--color-tertiary)` with `outline-offset: 2px`.
3. **DESIGN.md** — document the focus ring token (`focus-ring`) in the Components section.

## Non-Goals

- No changes to interactive elements' hover/active states — only adding `:focus-visible`.
- No JS-based focus management.
- No changes to the navigation toggle's focus behavior (already handles Escape key).

## Capabilities

### Modified Capabilities

- `SiteNav.tsx` — renders a skip-to-content `<a>` before the `<header>`.
- `design.css` — `:focus-visible` rule added after the button styles block.
- `DESIGN.md` — `focus-ring` token documented.

## Impact

- Frontend: 1 link added to SiteNav.tsx (~+5 lines), 1 CSS rule (~+5 lines).
- Accessibility: screen reader + keyboard users can bypass nav on every page.

Closes #125