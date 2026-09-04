# Spec Brief: X/Twitter Share Button for SharePanel

**Issue:** #65
**Status:** Draft → Ready for implementation

## Scope

Add an X (Twitter) share button to the post-vote SharePanel component alongside existing Telegram and VK buttons.

### What's in scope

1. New `IconX` SVG component in `ShareIcons.tsx` — official X/Twitter logo
2. New `xShareUrl()` function in `share.ts` — builds `https://twitter.com/intent/tweet?...` URL
3. New X share `<a>` button in `SharePanel.tsx` — placed after VK button, before clipboard copy
4. Tracking event `share_result_x` via existing `track()` mechanism

### What's out of scope

- No changes to styling or layout of SharePanel
- No badge generation changes
- No new tracking infrastructure
- No changes to other share targets

## Acceptance Criteria

1. **Icon renders:** X/Twitter SVG icon appears in the share-actions button group
2. **URL is correct:** Clicking the button opens `twitter.com/intent/tweet` with pre-filled text + site URL
3. **Share text matches existing format:** Uses `buildShareText()` output + site URL as the tweet content
4. **Tracking fires:** Clicking the button sends a `share_result_x` event via `/api/event`
5. **Accessibility:** Button has proper `aria-label`, `title`, `rel="noopener noreferrer"`
6. **No regressions:** All existing share buttons (Telegram, VK, clipboard, badge download, native share) continue to work
7. **TypeScript compiles:** `tsc --noEmit` passes with zero errors

## Files to change

- `frontend/src/ShareIcons.tsx` — add `IconX` component (+12 lines)
- `frontend/src/share.ts` — add `xShareUrl()` function (+7 lines)
- `frontend/src/SharePanel.tsx` — import + button element (+11 lines)
