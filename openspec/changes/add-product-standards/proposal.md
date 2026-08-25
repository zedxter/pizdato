# Add Product Standards — pizdato-net

## Why

pizdato-net is a live, promotion-phase channel. It needs product standards (unit economics,
North Star metric, quality gate, definition of done) documented in the repo so that promotion
work, content review, and growth decisions follow a fixed, agreed baseline instead of being
re-derived each time.

This aligns with the team rule (Danil, 25.08): every project documents its Product Standard
at start; one already lives in the team vault for pizdato-net.

## What

Add `product-standards.md` at the repo root (English, per GitHub-language rule), capturing:

- **Unit economics:** not monetized yet — audience-growth goal (promotion phase), not revenue.
- **North Star:** +5–10 new subscribers per week; secondary: view-rate (target order ~27–31%
  on small channels).
- **Quality gate:** `living-humanity-gate` (live language), post review by Yennefer before
  publishing, russian-grammar-check, mixed-script watchdog. Tone per platform (style-guide).
- **Definition of Done:** a post is published, clean in language/tone, no internal service info,
  and moves the +5/week goal (or records the reason for deviation).

## Acceptance criteria

- `product-standards.md` exists at repo root, English, covers the 4 mandatory axes.
- Matches the team's `projects/product-standards.md` entry for pizdato-net (single source of truth).
- `openspec validate --changes` passes.