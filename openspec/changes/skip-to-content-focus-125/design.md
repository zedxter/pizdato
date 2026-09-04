## Context

Pizdato is a single-page app with a persistent SiteNav rendered before main content. Keyboard and screen reader users must tab through all nav links before reaching the hero or content area. The dark design has no visible focus indicator.

## Goals

1. Keyboard users MUST be able to skip navigation to main content on every page.
2. All interactive elements MUST show a visible, design-system-compliant focus ring via `:focus-visible`.
3. The focus ring token MUST be documented in DESIGN.md so future elements inherit it.

## Decisions

### 1. Skip-to-content link

- Rendered as the first child of SiteNav's root fragment (before the anchor div).
- Pattern: `className="skip-link"` with CSS:
  - Default: `position: absolute; left: -9999px; top: 0; z-index: 10000;`
  - `:focus`: `left: 0;` — slides into view at the very top of the viewport.
- Target: `href="#main-content"` — an `id="main-content"` on the main `<section>` or hero block. Currently the hero is a `<section className="hero">` in App.tsx; add `id="main-content"` there.

### 2. `:focus-visible` rule

- Single global rule in design.css, following existing button style blocks:
  ```css
  :focus-visible {
    outline: 2px solid var(--color-tertiary);
    outline-offset: 2px;
  }
  ```
- Tertiary green — the only accent, works on dark backgrounds, doesn't conflict with danger (red) buttons.
- `outline-offset: 2px` gives breathing room around the element.

### 3. DESIGN.md token

- Add `focus-ring` to the Components section:
  ```
  focus-ring:
    outline: 2px solid {colors.tertiary}
    outline-offset: 2px
  ```

## Open Questions

- **App.tsx hero section:** does it already have an `id`? No — need to add `id="main-content"` to the hero `<section>`. (Confirmed by reading App.tsx — the hero `<section>` has `className="hero"` but no `id`.)

### Rollback

- Revert `SiteNav.tsx`, `App.tsx` hero id, remove `:focus-visible` rule from design.css, remove DESIGN.md entry.