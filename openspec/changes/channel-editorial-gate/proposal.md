# Channel editorial gate

## Why
Issue #205 reports repetitive coffee framing, uninteresting copy and Russian grammar errors. The active morning/evening prompts anchor coffee; history is siloed; final publication has format checks but no required independent editorial verdict. See `audit.md` for production evidence and the executed failing probe.

## What Changes
- Replace recurring scene examples with a process for choosing concrete, fresh angles.
- Supply a shared 14-day history of confirmed full posts to generation and review.
- Introduce a separate, structured editor decision bound to the final rendered text.
- Fail closed and regenerate on grammar, semantics or repetition defects.
- Version the editorial instruction bundle in the repository and verify installed parity.

## Capabilities
### New Capabilities
- `channel-editorial-quality`: freshness, language and semantic review before public delivery.

## Impact
`deploy/morning/`, `deploy/evening/`, a shared editorial module/resource bundle, their Node/Rust tests and installation docs. No Rust backend or frontend behavior changes. Existing schedules, formats, Telegram routing, source validation and duplicate/uncertain-send controls remain required.

## Non-goals
Changing publishing frequency, rewriting old public posts, publishing test messages, generalizing to all team channels, statistical AI detectors, or resuming old jobs.
