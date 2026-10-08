# Editorial revision intent — #210

Danil approved implementation on 2026-10-08 after reviewing the proposed repair-first flow. Preserve a worthwhile verified story when its text has repairable defects.

Scope: both scheduled writers, independent editorial verdict, shared host-owned retry state, prompts and tests. Each subject gets an initial submission and at most two repairs. At most three subjects are permitted within the unchanged 20-minute runner deadline. Repeated recent content and unusable sources require replacement immediately.

Acceptance: corrected copy can pass on the same source; revisions do not spend story slots; every final payload receives a complete fresh review; exhausted limits or invalid review cannot send. Structural submission failures are bounded too.

Existing agreed seams from #205/#207 remain shared gate API, real writer subprocesses with external HTTP doubles, and Rust runner subprocess tests. No new test seam is needed.

Must not: weaken quality thresholds, interpret earlier rejected revisions as published repeats, permit story churn during repair, modify schedules/credentials, or retry uncertain sends. Search reliability #209 is separate.

Risks: verdict misclassification; nine possible reviews cost more than three; discovery still may exhaust before any editorial submission. Local records must distinguish these outcomes. No estimate of production failure frequency is supported by the current sample.
