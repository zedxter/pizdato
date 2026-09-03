# AGENTS.md — Rules for Cursor (and any agent) in pizdato.net

Internal development project. Multi-profile team blog/website with Rust backend.

## 0. Language policy (MANDATORY)

All repository content is in English — README, docs, commit messages, PRs, specs.
Live conversations in the team vault may stay in Russian; the rule applies to
the GitHub repo and its PRs only.

## 1. What this project is

**pizdato.net** — the team's website. Rust backend (actix-web or axum),
static frontend, Docker deploy on VPS. Phase: promotion (live site accepting
audience).

## 2. Process

- **PR-only to main.** Never commit or push directly to `main`. Every change:
  branch -> PR -> review -> merge.
- **Full spec-driven cycle** (per team rules for all GitHub projects): Issue ->
  IDD brief -> spec (OpenSpec) -> spec-PR (review by 5 reviewers) ->
  implementation PR -> QA -> merge -> deploy.
- **GitHub Issues cover every change.** If no Issue exists, create one before
  starting work. Direct commits to main without a backing Issue are not allowed.
- **TDD mandatory** for code changes (Rust tests). No production code without a
  failing test first.

## 3. PR Stack & Force-Push Rules — GitHub auto-close protection

**Critical rule: `git push --force` to a branch with open PRs auto-closes them on GitHub.**

When you force-push to a branch that has an open Pull Request, GitHub detects
the force-push and closes the PR. This is **by design**, not a bug.

### What happens in a stack

In a PR stack (`feat/a <- feat/b <- feat/c` where each PR's `base` is the
parent's head branch), force-pushing to any parent cascades:

```
force-push to feat/a (branch has PR open)
  -> GitHub auto-closes all PRs on feat/a (head was rewritten)
  -> GitHub sends base_ref_force_pushed to PRs based on feat/a
  -> Those PRs also close because their base ref was rewritten
```

### Rules

1. **Never `git push --force` to a branch that has an open PR.** If you need to
   rewrite history, first close all PRs on that branch with an explanatory comment,
   then force-push, then reopen or create fresh PRs.
2. **Never force-push to a branch that is the `base` of another open PR.**
   Even if the branch itself has no open PR, force-pushing it closes every child.
3. **When restructuring a stack, create new branches.** Do not rewrite old ones.
   Pattern: close old PRs (with comment) -> delete old remote branches ->
   create new branches from the same point -> open new PRs. Deleting is safer
   than force-pushing.
4. **If auto-close happens accidentally, do NOT reopen the same PR.** Create a
   fresh PR from the new branch head instead.
5. **Cursor/Grok must not touch branches belonging to other tasks.** No
   force-push to branches of other open PRs, stacks, or tasks.
6. **`git push --force-with-lease` is restricted to YOUR OWN branch only.**
   Permitted only for rebasing your own feature branch after a parent was merged.
   Never use it on shared branches, parent branches, or main.

## 4. Rules that never get violated

1. The spec comes before the code (OpenSpec).
2. The test comes before the production code (TDD).
3. All repo content in English.
4. No PR merge without passing CI.
5. No direct pushes to main.

## 5. Local repos and worktree — canon (03.09, team-wide rule, applies to ALL repos)

**Never clone a team repo. Only the canonical clone in `/home/danil/projects/<repo>/` exists.**
**Work in git worktrees inside it instead of cloning into /tmp/ or elsewhere.**

1. **The only place for team-repo clones is `/home/danil/projects/<repo>/`.** Never clone
   into `/tmp/`, `$HOME`, or anywhere else.
2. **For branch/PR work — use `git worktree` inside the existing clone, not a fresh clone:**
   - Cursor / coding agents → `projects/<repo>/.worktrees/<branch>`
   - Vesemir (fixer) → `~/ws/<repo>/<branch>`
   - Clean up stale worktrees with `git worktree prune`
3. **Before creating a PR or touching code, check whether the repo already exists in
   `/home/danil/projects/`.** If yes, work inside it (with a worktree). `git clone` is
   allowed ONLY when the repo is absent from `projects/` — and it must go into `projects/`.
4. **Subagents and `delegate_task` MUST be passed the full local path**
   (`~/projects/<repo>/`) as context — missing path triggers agents to clone on their own.
5. **On violation:** don't fix silently — comment on the PR/Issue, clean the duplicate
   (`rm -rf` the clone outside projects/, `git worktree remove`). Record the violation
   in the offending profile's fact_store.
6. **Every new repo's AGENTS.md MUST include this section** (or reference the canonical
   team-vault version at `docs/conventions-core.md`). The `team-project-kickoff` template
   enforces this for future projects.

See also: `/home/danil/vault/pizdato/docs/conventions-core.md` § "Локальные репозитории и worktree"

## 6. Roles

- **Owner — Danil (zedxter).** Green-lights work, approves spec-PRs.
- **Geralt** — CTO: architecture, code review, CI/CD.
- **Yennefer** — PM/PO: scope review, priority coordination.
- **Vesemir** — QA: regression testing, BDD traceability.
