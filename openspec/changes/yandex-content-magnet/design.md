## Context

See `proposal.md` for motivation. Constraints that shape the approach:

- Frontend is a Vite multi-page SPA: each route has an HTML shell; React hydrates `#root`. Article bodies live in `frontend/src/articles.ts`.
- The “синдром отложенной жизни” page is the reference: full body in `#root` + noscript, `articleBody` in JSON-LD, dedicated hero + `og:image`.
- Other articles still ship thin shells (empty `#root`, short noscript) — weak for Yandex unless JS rendering is forced.
- Telegram publishing already has a voice skill (evening post + magnet teaser pattern); channel is tiny but the ritual exists.
- Site is already verified in Yandex Webmaster and Google Search Console; operators have not yet used those dashboards for index/render checks.
- Brand contains mature slang — title strategy should lead with topic demand and put brand in the suffix.

## Goals / Non-Goals

**Goals:**

- Yandex-readable magnets (static content parity + Webmaster posture).
- Measurable funnel: organic → article → vote / TG.
- Repeatable weekly publish path that does not drift from SEO conventions.
- Design that fits existing essay/article visual system (hero figure, dark grain aesthetic).

**Non-Goals:**

- Full SSR framework migration (Next/Remix) in this change.
- Paid acquisition, email, or non-TG social stacks.
- Changing vote API, one-vote rules, or news ranking.
- Medical advice productization.

## Decisions

### 1) Static HTML parity over “JS-only + hope”

- **Choice:** Extend the синдром shell model to all articles (full body + figure in initial HTML; keep React as progressive enhancement for nav/UI).
- **Why:** Yandex JS rendering exists but is discretionary/budgeted; content magnets need reliable text in the first response.
- **Alternatives:** Force JS render only (faster to ship, fragile); full SSR framework (heavier than needed now).

### 2) Generate shells from `articles.ts` (light automation)

- **Choice:** Prefer a small build/publish helper that syncs article HTML shells (meta, JSON-LD `articleBody`, noscript/`#root` body, og image) from the registry, rather than hand-editing five files forever.
- **Why:** Weekly cadence will otherwise desync SEO shells from React content (already happened once).
- **Alternatives:** Manual copy each time (error-prone); MDX/contentlayer (larger rewrite).

### 3) Yandex.Metrica as the analytics source of truth

- **Choice:** Ship Metrica on public pages; define goals for successful vote and TG outbound clicks. Use Webmaster for index/render; Metrica for behavior.
- **Why:** Yandex-first strategy; behavioral signals matter more there; GSC stays secondary.
- **Alternatives:** GA4-only (weaker Yandex loop); no analytics (flying blind).

### 4) Content operating model: magnet + pulse

- **Choice:** ~1 magnet/week on `/articles`; daily/near-daily TG pulse using existing evening format; every magnet gets a same-day TG teaser with article URL + home CTA.
- **Why:** Matches brand skill already in repo; separates SEO depth from retention cadence.
- **Alternatives:** TG-only growth (no SERP); site-only without TG (weak subscribe goal).

### 5) Title / snippet strategy for slang brand

- **Choice:** Magnet `<title>` / H1 lead with the demand topic; brand/`пиздато` in subtitle, dek, or title suffix (`… | pizdato.net`). Keep пиздато inside body as meaning, not stuffing.
- **Why:** Softens adult-filter risk while preserving voice.
- **Alternatives:** Brand-first titles everywhere (harder topic ranking).

### 6) Лента role

- **Choice:** Keep лента as freshness/pulse feedstock for TG and on-site engagement, not as primary SEO magnets (news URLs rot; thin without JS today).
- **Why:** Effort ROI favors evergreen/topic articles for Yandex.
- **Follow-up (optional later):** noscript teasers for last N news — out of P0.

## Risks / Trade-offs

- **[Risk] Mature language suppresses SERP** → Mitigation: topic-led titles; magnets that stand without the swear; measure impressions in Webmaster.
- **[Risk] Shell/registry drift** → Mitigation: generate-from-registry helper + checklist in tasks.
- **[Risk] Metrica without consent banner complexity** → Mitigation: keep counter lightweight; revisit if legal requirements change; do not gate voting on analytics.
- **[Risk] Weekly content quality drop** → Mitigation: editorial bar from `content-magnet` spec + channel voice skill; skip a week rather than ship empty SEO filler.
- **[Trade-off] Static HTML duplicates React body** → Acceptable duplication until a heavier SSR stack is justified.

## Migration Plan

1. Baseline in Yandex Webmaster: indexed URLs, sitemap status, enable/confirm JS rendering, page-check синдром vs a thin article.
2. Add Metrica + goals; verify events in real browser.
3. Bring remaining articles to static parity (helper or one-time sync); redeploy.
4. Lock publish ritual (site → sitemap → TG teaser).
5. Start weekly magnets; watch Webmaster queries + Metrica goals for 2–4 weeks; adjust topics.

Rollback: remove Metrica snippet if needed; static HTML is additive and safe to leave; TG posts are independent.

## Open Questions

- Exact Metrica counter ID and whether goals use JS `reachGoal` vs click URLs (decide at install time).
- First 4–6 magnet topics calendar (editorial, not blocking engineering P0).
- Whether `/issledovanie` gets the same static-body treatment in this change or a follow-up (recommend follow-up; long essay already partially SEO’d).
