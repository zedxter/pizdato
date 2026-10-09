# Intent: finish every evening edition

Issue: #214. Related discovery defect: #209.

## Outcome and scope

An evening edition must remain work in progress until a fully approved post is confirmed delivered. Repair correctable drafts using all findings without an overall revision-count ceiling. Preserve verified stories unless they are duplicates or fundamentally unsupported. Include discovery recovery: yesterday's failure preceded editorial review. Morning scheduling and editorial behavior are outside scope; only final publication coordination is shared to prevent history races.

## Acceptance criteria

- Ten consecutive repair verdicts followed by approval produce one approved send, including across process restarts.
- Exhausted discovery work, process deadlines and transient provider failures preserve the edition and cause later retries.
- Irrelevant search results activate independent source discovery; each resulting candidate still needs evidence, a source cover and full review.
- Delivery confirmations suppress duplicate sends; ambiguous outcomes remain visibly pending for reconciliation.
- Missed editions survive midnight and restart; delayed copy is updated and reviewed against current facts and confirmed history.

## Must-nots and risks

Never lower the gate, publish unchecked filler, claim guaranteed external availability, lose drafts on timeout, loop at full speed, expose secrets, change morning scheduling or editorial behavior or automatically resend an ambiguous Telegram request. Bound each activation and retry frequency, not total editorial opportunities. Endless editorial disagreement remains visible as delayed work, not a false success.

## Decisions

Use existing gate and real worker subprocess test seams, including Rust runner coverage. Specification requires five independent reviews, owner approval and passing CI before production code. The proposed behavior is concrete in the accompanying OpenSpec change; deployment remains subject to the normal implementation review and QA process.
