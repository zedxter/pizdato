<!---
  IMPORTANT — Issue reference is MANDATORY.
  Only these keywords are allowed:
    Closes #N   — fully resolves the Issue
    Fixes #N    — fully resolves the Issue (bug fix)
    Resolves #N — fully resolves the Issue

  "Refs #N" and "Partially addresses #N" are FORBIDDEN.
  Without a Closes/Fixes/Resolves line, CI fails and the PR cannot merge.
--->

## Related Issue

<!-- REQUIRED: Put Closes #N / Fixes #N / Resolves #N here -->
Closes #

## Summary

<!-- What this PR does and why -->

## Changes

<!-- Key changes (bullet points) -->

## Testing

<!-- How was this tested? CI, manual, specific test output -->

## Checklist

- [ ] "Closes #N" / "Fixes #N" / "Resolves #N" in body (Related Issue section)
- [ ] One PR = one Issue (exception: owner-approved multi-Issue PR)
- [ ] `git diff main --name-only` shows only files relevant to this Issue
- [ ] CI is green