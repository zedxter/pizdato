## 1. Homepage (Yandex blocker)

- [x] 1.1 Copy existing `<noscript><main>` prose into `#root` on `frontend/index.html` (keep noscript in sync)
- [x] 1.2 Curl-verify local/built `/` has non-empty extractable text inside `#root` without JS

## 2. Other product shells

- [x] 2.1 Fill `#root` from existing noscript on `pizdato.html`, `lenta.html`, `faq.html`, `issledovanie.html`
- [x] 2.2 Extend `sync-article-shells.ts` `syncArticlesIndex` so `#root` on `articles.html` gets the same list as noscript; run sync once
- [x] 2.3 Curl-verify `#root` text for `/pizdato`, `/lenta`, `/articles`, `/faq`, `/issledovanie`

## 3. Deploy and Webmaster

- [x] 3.1 Build and deploy frontend
- [x] 3.2 Production curl-verify `/` (and spot-check one other product URL) for `#root` text without JS
- [ ] 3.3 Re-check homepage in Yandex Webmaster; confirm “документ не содержит текст” / главная-недоступна clears or no longer cites empty document text
