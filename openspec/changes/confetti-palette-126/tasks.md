# Tasks — Confetti Palette

All estimates assume the developer has the repo and DESIGN.md open.

## T1: Add confetti tokens to DESIGN.md

- File: `DESIGN.md`
- Add `confetti-good` and `confetti-bad` token entries to the Colors section
- Document the reasoning: pure tertiary/danger gradient, no yellow
- Estimation: 10 min

## T2: Add confetti CSS vars to design.css

- File: `frontend/public/design.css`
- Add `--color-confetti-good` and `--color-confetti-bad` to `:root`
- Store as comma-separated quoted string values
- Estimation: 10 min

## T3: Update App.tsx to read CSS vars

- File: `frontend/src/App.tsx`
- Replace hardcoded `GOOD_COLORS` and `BAD_COLORS` arrays with CSS var readers
- Keep the `const` declarations; add a helper `parseConfettiColors(cssVar)` if needed
- Estimation: 15 min

## T4: Remove stale colors from final array

- Confirm no remaining refs to `#f2ff57` or `#ffd23d` anywhere in the repo
- `rg '#f2ff57' frontend/ || 'ok'`
- `rg '#ffd23d' frontend/ || 'ok'`
- Estimation: 5 min

---

**Total:** ~40 min
**Dependencies:** T1 → T2 → T3 (serial, since each step references the previous)