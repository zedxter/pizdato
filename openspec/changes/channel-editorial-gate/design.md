# Design

## Publication flow
Host loads confirmed full history → generator proposes candidate → existing structural/source checks → render exact payload → independent editorial request → structured approval validation → final structural and text-identity checks → existing pending/send/receipt sequence.

## History and variety
Load morning and evening archives only when a matching success marker confirms publication, within the current Europe/Berlin calendar day and the previous 13 calendar days. Exclude drafts and failed attempts. Deterministically order entries and preserve complete text; bound input using the existing per-post limits. A genuinely empty history is valid; unreadable/corrupt expected history is an error, not silent permission to publish.

Pass wishes, hooks and wisdom to both writer and editor. The editor compares comic premise, opening structure and punchline, not only token equality. Exact normalized wisdom repeats are deterministic rejects. Fixed attribution/CTA and necessary factual vocabulary are exempt from similarity judgments. For the initial recovery period, prohibit beverage rituals as narrator framing in both slots; an evening story actually about a beverage may retain verified facts without adding a drinking/choking scene. Other topics must also rotate: replacing coffee with tea everywhere fails.

## Generation
Use the proposed instructions in `prompt-drafts.md`, integrated into existing output/source/format contracts. Generate a small set of distinct angles internally, choose a fresh concrete observation, and discard wordplay that requires explaining. Third-person Misha remains a voice requirement, not an obligation to open every story with his name or reaction. Keep 10–15-word wisdom initially; rewrite the thought rather than pad or distort syntax to meet the count. Preserve the existing two decorative morning emojis in this change; the coffee icon does not require coffee subject matter.

## Editor contract
A fresh request has no writer scratchpad or self-assessment. It receives the exact rendered candidate, trusted rubric, confirmed history and (evening) the primary source and up to ten explicitly cited, fetched supporting sources (including site APIs) as delimited untrusted data, with no tools or publication capability. Require JSON with `decision` (`approve` or `revise`) and explicit boolean results for `grammar`, `meaning`, `freshness`, `voice`, `grounding`, plus actionable issues. Missing/unknown fields, wrong types, tool calls, parsing failure, timeout or contradictory approve/failed dimension results block publication. Approval requires every dimension true and no issues. Operational exceptions are errors, never implicit approval.

Bind the result locally to a SHA-256 hash of the exact payload reviewed; the host computes the hash and associates it with that request, rather than trusting a model-provided hash. A mutation after approval invalidates approval. The editor returns findings, not a silently rewritten publishable message. After a valid rejection, the writer MUST choose a different morning subject or evening story/source on rounds one and two; the host renders and reviews again. Allow up to 30 discovery model steps for each candidate and at most three candidate-review rounds, each under the existing overall runtime deadline. An editor transport failure stops the run; a valid revise decision may use the remaining rounds.

Keep current provider/model initially, but use a separate editor context and conservative sampling. A second context is not a guarantee of independent model judgment. Behavioral evaluation is the release criterion for the selected model/instructions.

## Boundaries and packaging
A shared editorial module owns history, the rubric, structured verdict validation and bounded review orchestration. Both host send paths MUST call it; `complete_post` acceptance alone no longer authorizes evening delivery. Version the channel-specific editorial instructions and required polish resources under a shared deployment directory, with stable local installation paths for both jobs. Installation must include the morning transport copy and all shared files; record source revision and hashes to detect drift. Do not change the original global Hermes skill or unrelated public channels.

## Failure handling
Store rejected candidates and dimension-specific findings in local state, with no credentials. Do not create success markers or send-intent records before editorial approval. Failed review exits nonzero and is visible in the existing cron log. Keep pending-send reconciliation semantics, identity checks, locks and receipt handling intact. No template fallback bypasses review; no test sends or owner DMs are necessary.

## Verification and rollout
Before production code, add failing Node tests at the host publication seam with stubbed model and Telegram transport, plus Rust runner integration tests matching the repo convention. Cover reviewer rejection/error, mutation, exhaustion, history across slots and confirmed-only filtering. Preserve all existing tests. Add labeled linguistic fixtures for grammar, semantic impossibility, repeated framing and valid idiomatic humor. Run three non-publishing trials per fixture; all unacceptable fixtures must be rejected and all acceptable fixtures approved, with failures prompting rubric/model investigation rather than relabeling to match output. Record outputs/model/settings. Run both real dry-run paths without sending; manually inspect their saved final texts and review results.

After reviewed implementation and passing CI, back up installed files, deploy a coherent bundle while holding both runner locks, read back hashes, and run check/dry-run. Existing crontab times remain unchanged. Roll back the entire bundle from the backup under locks; preserve archives, receipts and pending intents. Observe the next scheduled receipts and first week's topic variety without claiming long-term improvement from one dry-run.

## Trade-offs
Hard orchestration guarantees review occurs; grammar/freshness accuracy remains probabilistic. Fail-closed review may skip a daily slot. This is preferable to silently publishing a draft that failed the agreed editorial checks. Global public-message gate standardization is a separate change after this channel demonstrates acceptable behavior.
