# Contributing to pizdato.net

First off, thanks for taking the time to contribute! 🎉

pizdato.net is a community-driven voting site and Telegram channel. This document outlines the process for contributing — whether you're reporting a bug, suggesting a feature, or submitting code changes.

## Code of Conduct

This project and everyone participating in it is governed by the [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## What we're building

- **Site:** [pizdato.net](https://pizdato.net) — two-button voting with wisdom quotes, share flow, and news feed
- **Channel:** [@pizdato_net](https://t.me/pizdato_net) — daily absurd news votes
- **Stack:** Rust (Axum) + SQLite backend, React + Vite (TypeScript) frontend, Docker deploy on VPS
- **MCP:** Public Streamable HTTP endpoint at `https://pizdato.net/mcp`

## How to contribute

### Reporting bugs

Open a [GitHub Issue](https://github.com/zedxter/pizdato/issues/new) with:

- A clear title and description
- Steps to reproduce (if applicable)
- Expected vs actual behavior
- Screenshots (for UI issues)
- Browser/device info (for frontend issues)

### Suggesting features

Open a [GitHub Issue](https://github.com/zedxter/pizdato/issues/new) with:

- What problem it solves (not just what you want to build)
- How it fits the product (voting, wisdom, share, community)
- Any existing examples or references

### Submitting code

1. **Find or create an Issue** — every change needs a backing Issue
2. **Fork the repo** and create a branch from `main`
3. **Follow the spec-driven process** for non-trivial changes:
   - OpenSpec proposal → spec → implementation
4. **Write tests** — TDD is mandatory for Rust backend code
5. **Run CI checks locally** before pushing:
   - `cargo check && cargo test` (backend)
   - `npm run lint && npm run build` (frontend)
6. **Open a Pull Request** with:
   - `Closes #N` in the description (linking to the Issue)
   - Description of what changed and why
   - Any relevant screenshots or test results

### PR guidelines

- Keep PRs focused — one logical change per PR
- Follow the [AGENTS.md](AGENTS.md) process rules (PR-only to main, no direct pushes)
- All repo content in English (README, docs, commit messages, PRs)
- The landing page is in Russian (the audience is Russian-speaking)

## Development setup

See [README.md](README.md) for local development instructions.

```
# Backend
cd backend
cp ../deploy/pizdato.env.example .env
# Set COOKIE_SECURE=false for local HTTP
cargo run

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

## Questions?

- Open a [GitHub Discussion](https://github.com/zedxter/pizdato/discussions)
- Reach out on Telegram: [@pizdato_net](https://t.me/pizdato_net)

## Attribution

This CONTRIBUTING.md is adapted from the [Contributor Covenant](https://www.contributor-covenant.org/) template.