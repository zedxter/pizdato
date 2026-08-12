## Context

See proposal.md. Existing magnets live in `frontend/src/articles.ts` with `MAGNET_DUAL_CTA_HTML`. Static shells sync from the registry. Prior failed draft taught: one argument line, concrete scenes, no stacked metaphors.

## Goals / Non-Goals

**Goals:**
- Short articles become useful Yandex landings for their head queries.
- Long articles read cleaner without losing voice.
- Meta matches body; shells and sitemap `lastmod` refresh on deploy.

**Non-Goals:**
- New weekly magnet or TG announcement for this rewrite.
- Slug renames / redirects.
- New hero image generation unless a caption is factually wrong.

## Decisions

### 1. Depth = rewrite shorts + polish longs
As planned: full rewrite of three shorts; surgical polish of синдром and тонкая грань.

### 2. Slugs frozen
Keep all five paths for index continuity.

### 3. Editorial standard
Hook → answer the query → pizdato pivot → dual CTA. One idea per paragraph. Ironic, no moralizing. Internal links to sibling articles + `/` + FAQ where useful.

### 4. SEO meta
Target ~150–160 char `description`; title carries primary query; keywords stay short RU phrases. Bump `dateModified` on every touched article.

### 5. Specs touch
Delta on `content-magnet` (clarity + meta intent) and light `seo-indexability` MODIFIED for meta/body alignment on content updates — not new crawl machinery.

## Risks / Trade-offs

- **[Risk] Over-rewrite синдрома** → Mitigation: polish only; preserve research spine (Серкин, признаки, pivot).
- **[Risk] SEO stuffing** → Mitigation: natural query phrases in title/H2, not keyword lists in prose.
- **[Trade-off] No TG blast** → Accepted; rewrites are not a new magnet ritual.

## Migration Plan

1. Land OpenSpec artifacts.
2. Edit `articles.ts`; sync shells; build; deploy.
3. Curl-verify five URLs.
4. Archive change after sync of delta specs to main (separate sync step when ready).

## Open Questions

- None for apply.
