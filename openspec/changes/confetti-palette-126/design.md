## Context

Confetti (`canvas-confetti`) on vote is purely decorative — not functional UI. However the color arrays in App.tsx included colors (`#f2ff57` yellow, `#ffd23d` yellow) that are not in the DESIGN.md palette. Per the RainbowStrip anti-pattern, adding a third accent (yellow) next to green and red weakens the binary polarity that defines pizdato's visual identity.

## Goals

1. Confetti colors MUST be derived exclusively from tertiary (good) and danger (bad) spectrum.
2. Each palette MUST be documented as a DESIGN.md token array so future changes are auditable.
3. CSS custom properties MUST expose the arrays so they remain readable from JS.

## Decisions

### 1. GOOD_COLORS palette

Replace `['#3dff9a', '#22d97f', '#f2ff57', '#ffffff', '#7dffc8']` with pure tertiary gradient:

| Color | Hex | Source |
|-------|-----|--------|
| tertiary | `#3DFF9A` | DESIGN.md — base green |
| tertiary-tint-1 | `#22d97f` | darker step of tertiary |
| tertiary-tint-2 | `#7dffc8` | lighter step of tertiary |
| white | `#ffffff` | neutral highlight (decorative confetti only) |

Removed: `#f2ff57` (yellow).

### 2. BAD_COLORS palette

Replace `['#ff4d3d', '#ff7a3d', '#ffd23d', '#ffffff', '#ff8a7d']` with pure danger gradient:

| Color | Hex | Source |
|-------|-----|--------|
| danger | `#FF4D3D` | DESIGN.md — base red |
| danger-tint-1 | `#ff7a3d` | lighter step of danger |
| danger-tint-2 | `#ff8a7d` | lighter step of danger |
| white | `#ffffff` | neutral highlight |

Removed: `#ffd23d` (yellow).

### 3. Token naming

- `confetti-good` → array `["#3dff9a", "#22d97f", "#7dffc8", "#ffffff"]`
- `confetti-bad` → array `["#ff4d3d", "#ff7a3d", "#ff8a7d", "#ffffff"]`

CSS custom properties: `--color-confetti-good` and `--color-confetti-bad` store a comma-separated string; JS reads `getComputedStyle(root).getPropertyValue('--color-confetti-good').split(',').map(s => s.trim())`.

### 4. Why CSS vars instead of a TS module

Minimal footprint — adding a `design-tokens.ts` file for a single constant is unnecessary ceremony for a decorative feature. Reading from CSS keeps the source of truth in design.css where all token consumers already look.

## Open Questions

None.