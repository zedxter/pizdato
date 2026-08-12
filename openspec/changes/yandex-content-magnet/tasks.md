## 1. Yandex baseline (ops)

- [ ] 1.1 In Yandex Webmaster, confirm sitemap accepted and note indexed vs excluded URL counts
- [x] 1.2 Set JavaScript rendering to prefer rendering (until static parity is done); run page check on `/articles/sindrom-otlozhennoj-zhizni` vs a thin article shell
- [ ] 1.3 Skim Google Search Console only as a mirror (coverage / sitemap); no Google-first changes

## 2. Growth measurement

- [x] 2.1 Create/confirm Yandex.Metrica counter; add snippet to public HTML entry points (home, articles index, article shells, lenta, pizdato, faq, issledovanie)
- [x] 2.2 Define and verify goal: successful home vote (`reachGoal` or equivalent after accepted vote)
- [x] 2.3 Define and verify goal: primary click to `t.me/pizdato_net`
- [x] 2.4 Smoke-check that voting still works with analytics blocked / failed

## 3. SEO indexability (engineering)

- [x] 3.1 Add a small sync helper (or documented script) that builds article HTML shells from `articles.ts` (meta, JSON-LD including articleBody, `#root` + noscript full body, og image)
- [x] 3.2 Bring remaining articles to синдром-level static parity via the helper
- [x] 3.3 Ensure `/articles` index meta/ItemList stay in sync when magnets are added
- [x] 3.4 On publish path: update `sitemap.xml` `lastmod` for touched article + `/articles`; deploy and curl-verify full body in HTML without JS assumptions

## 4. Content magnet productization

- [ ] 4.1 Standardize dual CTA block at end of magnets (vote home + TG) in brand voice; apply to existing articles missing a clear TG CTA
- [ ] 4.2 Document publish ritual in-repo (short checklist): registry → helper → sitemap → build/deploy → TG teaser with link preview + home CTA
- [ ] 4.3 Draft 4–6 magnet topic candidates (demand query → pizdato pivot); pick the next one to write

## 5. First weekly cycle

- [ ] 5.1 Write, illustrate, SEO-shell, and deploy the next magnet
- [ ] 5.2 Publish same-day TG teaser + track Metrica (article landings, vote goal, TG goal) for 7 days
- [ ] 5.3 Review Webmaster queries/impressions after the cycle; adjust titles/topics if needed
