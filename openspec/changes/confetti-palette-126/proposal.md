## Why

Issue #126: confetti palette in App.tsx (`canvas-confetti`) uses hardcoded hex colors outside the DESIGN.md palette. Two colors in particular — `#f2ff57` (yellow) and `#ffd23d` (yellow) — violate the binary green/red polarity and introduce a third accent color that competes with tertiary and danger.

## What Changes

1. **GOOD_COLORS** — remove yellow (`#f2ff57`); keep only gradient tints of tertiary (`#3DFF9A`).
2. **BAD_COLORS** — remove yellow (`#ffd23d`); keep only gradient tints of danger (`#FF4D3D`).
3. **DESIGN.md** — add `confetti-good` and `confetti-bad` token arrays documenting the confetti palette.
4. **design.css** — add `--color-confetti-good` and `--color-confetti-bad` as comma-separated CSS custom properties readable from JS.

## Non-Goals

- No new npm dependencies.
- No changes to confetti animation logic (particle count, spread, gravity).
- No layout or z-index changes.

## Capabilities

### Modified Capabilities

- `App.tsx` — `GOOD_COLORS` and `BAD_COLORS` arrays now only reference DESIGN.md-compliant tertiary/danger tints.
- `design.css` — two new CSS custom properties under `:root`.
- `DESIGN.md` — new `confetti-good` and `confetti-bad` tokens documented in the Colors section.

## Impact

- Frontend JS: 1 line changed per array.
- Design system: 2 new tokens.

Closes #126