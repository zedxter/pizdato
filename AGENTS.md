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

## 2. Tech stack

- **Backend:** Rust (actix-web or axum)
- **Frontend:** Static HTML/CSS/JS
- **Deploy:** Docker on VPS, GitHub Actions (self-hosted runner)
- **TDD mandatory** for Rust code changes.

## 3. Local repos and worktree

**Never clone a team repo. Only the canonical clone in `/home/danil/projects/<repo>/` exists.**
**Work in git worktrees inside it instead of cloning into /tmp/ or elsewhere.**

1. The only place for team-repo clones is `/home/danil/projects/<repo>/`.
2. For branch/PR work — use `git worktree` inside the existing clone:
   - Cursor / coding agents → `projects/<repo>/.worktrees/<branch>`
   - Clean up stale worktrees with `git worktree prune`
3. Before creating a PR or touching code, check whether the repo already exists in
   `/home/danil/projects/`.

## 4. Roles

- **Owner — Danil (zedxter).** Green-lights work, approves spec-PRs.
- **Geralt** — CTO: architecture, code review, CI/CD.
- **Yennefer** — PM/PO: scope review, priority coordination.
- **Vesemir** — QA: regression testing, BDD traceability.