/**
 * Sync article HTML shells + sitemap + articles index list from src/articles.ts.
 *
 * Usage: npx tsx scripts/sync-article-shells.ts
 * Also run via: npm run sync:articles
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ARTICLES, type Article } from '../src/articles.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SITE = 'https://pizdato.net'

const RU_MONTHS = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
]

const METRIKA = `
    <!-- Yandex.Metrika counter -->
    <script type="text/javascript">
      (function(m,e,t,r,i,k,a){
        m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();
        for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
        k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
      })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=111534101', 'ym');
      ym(111534101, 'init', {ssr:true, webvisor:true, clickmap:true, triggerEvent:true, accurateTrackBounce:true, trackLinks:true});
    </script>
    <!-- /Yandex.Metrika counter -->
`

const METRIKA_NOSCRIPT = `    <noscript><div><img src="https://mc.yandex.ru/watch/111534101" style="position:absolute; left:-9999px;" alt="" /></div></noscript>
`

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${d} ${RU_MONTHS[m - 1]} ${y}`
}

function plainBody(html: string): string {
  let t = html.replace(/<h2>(.*?)<\/h2>/gi, '\n\n$1. ')
  t = t.replace(/<[^>]+>/g, ' ')
  t = t.replace(/&nbsp;/g, ' ').replace(/&laquo;/g, '«').replace(/&raquo;/g, '»')
  t = t.replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&hellip;/g, '…')
  t = t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  t = t.replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  return t.replace(/\s+/g, ' ').trim()
}

function indentBlock(html: string, spaces: number): string {
  const pad = ' '.repeat(spaces)
  return html
    .trim()
    .split('\n')
    .map((line) => (line.trim() ? pad + line.trim() : ''))
    .join('\n')
}

function articleShell(a: Article): string {
  const url = `${SITE}/articles/${a.slug}`
  const titlePage = `${a.title} | pizdato.net`
  const imageAbs = `${SITE}${a.image.src}`
  const plain = plainBody(a.bodyHtml)
  const crumbsName = a.title.length > 48 ? a.title.slice(0, 45) + '…' : a.title
  const firstTag = a.keywords.split(',')[0]?.trim() || 'пиздато'

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE}/#organization`,
        name: 'пиздато',
        url: `${SITE}/`,
        logo: `${SITE}/logo.png`,
        sameAs: ['https://t.me/pizdato_net'],
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Голосование', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: 'Статьи', item: `${SITE}/articles` },
          { '@type': 'ListItem', position: 3, name: crumbsName, item: url },
        ],
      },
      {
        '@type': 'Article',
        '@id': `${url}#article`,
        url,
        headline: a.title,
        description: a.description,
        articleBody: plain,
        inLanguage: 'ru-RU',
        datePublished: a.datePublished,
        dateModified: a.dateModified,
        wordCount: plain.split(/\s+/).filter(Boolean).length,
        timeRequired: `PT${a.readingMinutes}M`,
        keywords: a.keywords.split(',').map((k) => k.trim()).filter(Boolean),
        author: { '@id': `${SITE}/#organization` },
        publisher: { '@id': `${SITE}/#organization` },
        image: {
          '@type': 'ImageObject',
          url: imageAbs,
          width: a.image.width,
          height: a.image.height,
          caption: a.image.caption,
        },
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        isAccessibleForFree: true,
      },
    ],
  }

  const ldJson = JSON.stringify(ld, null, 2)
    .split('\n')
    .map((line, i) => (i === 0 ? line : `      ${line}`))
    .join('\n')

  const body = indentBlock(a.bodyHtml, 8)
  const figure = `        <figure>
          <img
            src="${esc(a.image.src)}"
            alt="${esc(a.image.alt)}"
            width="${a.image.width}"
            height="${a.image.height}"
          />
          <figcaption>${esc(a.image.caption)}</figcaption>
        </figure>`

  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />

    <title>${esc(titlePage)}</title>
    <meta name="description" content="${esc(a.description)}" />
    <meta name="keywords" content="${esc(a.keywords)}" />
    <meta name="author" content="pizdato" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta name="theme-color" content="#0c1210" />
    <meta name="color-scheme" content="dark" />

    <link rel="canonical" href="${url}" />
    <link rel="alternate" hreflang="ru" href="${url}" />
    <link rel="alternate" hreflang="x-default" href="${url}" />

    <meta property="og:type" content="article" />
    <meta property="og:locale" content="ru_RU" />
    <meta property="og:site_name" content="пиздато" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${esc(titlePage)}" />
    <meta property="og:description" content="${esc(a.dek)}" />
    <meta property="og:image" content="${imageAbs}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="${a.image.width}" />
    <meta property="og:image:height" content="${a.image.height}" />
    <meta property="article:published_time" content="${a.datePublished}" />
    <meta property="article:modified_time" content="${a.dateModified}" />
    <meta property="article:section" content="Статьи" />
    <meta property="article:tag" content="${esc(firstTag)}" />
    <meta property="article:tag" content="пиздато" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(titlePage)}" />
    <meta name="twitter:description" content="${esc(a.dek)}" />
    <meta name="twitter:image" content="${imageAbs}" />

    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32" />
    <link rel="icon" href="/favicon.png" type="image/png" sizes="512x512" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
    <link rel="manifest" href="/site.webmanifest" />

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Manrope:wght@400;600;700;800&display=swap"
      rel="stylesheet"
    />

    <script type="application/ld+json">
      ${ldJson}
    </script>
${METRIKA}  </head>
  <body>
    <div id="root">
      <article>
        <header>
          <p><a href="/articles">Статьи</a></p>
          <h1>${esc(a.title)}</h1>
          <p>${esc(a.dek)}</p>
          <p>pizdato.net · ~${a.readingMinutes} мин · <time datetime="${a.datePublished}">${formatDate(a.datePublished)}</time></p>
        </header>
${figure}
${body}
        <nav aria-label="Ещё по теме">
          <a href="/articles">Все статьи</a> ·
          <a href="/">Голосование</a> ·
          <a href="/lenta">Лента</a>
        </nav>
      </article>
    </div>
    <noscript>
      <main>
        <p><a href="/articles">← Статьи</a> · <a href="/">Голосование</a></p>
        <h1>${esc(a.title)}</h1>
        <p>${esc(a.dek)}</p>
${figure}
${body}
        <p>
          <a href="/">Проголосовать</a> ·
          <a href="https://t.me/pizdato_net">Telegram-канал пиздато — @pizdato_net</a>
        </p>
      </main>
    </noscript>
${METRIKA_NOSCRIPT}    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`
}

function syncSitemap(articles: Article[]): void {
  const newestArticle = articles.reduce(
    (max, a) => (a.dateModified > max ? a.dateModified : max),
    articles[0]?.dateModified ?? '2026-08-11',
  )
  const articleUrls = articles
    .map(
      (a, i) => `  <url>
    <loc>${SITE}/articles/${a.slug}</loc>
    <lastmod>${a.dateModified}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${i === 0 ? '0.9' : '0.8'}</priority>
  </url>`,
    )
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE}/</loc>
    <lastmod>2026-08-11</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${SITE}/pizdato</loc>
    <lastmod>2026-08-11</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.95</priority>
  </url>
  <url>
    <loc>${SITE}/lenta</loc>
    <lastmod>2026-08-11</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${SITE}/articles</loc>
    <lastmod>${newestArticle}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>
${articleUrls}
  <url>
    <loc>${SITE}/issledovanie</loc>
    <lastmod>2026-08-11</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${SITE}/faq</loc>
    <lastmod>2026-08-11</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.65</priority>
  </url>
</urlset>
`
  writeFileSync(join(ROOT, 'public/sitemap.xml'), xml)
}

function syncArticlesIndex(articles: Article[]): void {
  const path = join(ROOT, 'articles.html')
  let html = readFileSync(path, 'utf8')

  const itemList = articles
    .map(
      (a, i) => `                {
                  "@type": "ListItem",
                  "position": ${i + 1},
                  "url": "${SITE}/articles/${a.slug}",
                  "name": ${JSON.stringify(a.title)}
                }`,
    )
    .join(',\n')

  // Only replace the CollectionPage → ItemList block, not BreadcrumbList.
  html = html.replace(
    /("@type":\s*"ItemList",\s*"itemListElement":\s*\[)([\s\S]*?)(\n\s*\])/,
    (_m, open: string, _old: string, close: string) => `${open}\n${itemList}${close}`,
  )

  const noscriptItems = articles
    .map((a) => {
      const blurb = a.dek.length > 110 ? a.dek.slice(0, 107) + '…' : a.dek
      return `          <li>
            <a href="/articles/${a.slug}">${esc(a.title)}</a>
            — ${esc(blurb)}
          </li>`
    })
    .join('\n')

  // Update both #root and noscript article lists (same markup twice).
  html = html.replace(
    /(<ul>\n)([\s\S]*?)(\n\s*<\/ul>\s*\n\s*<p>\s*\n\s*<a href="\/pizdato">)/g,
    (_m, open: string, _old: string, close: string) => `${open}${noscriptItems}${close}`,
  )

  writeFileSync(path, html)
}

function main(): void {
  mkdirSync(join(ROOT, 'articles'), { recursive: true })
  for (const a of ARTICLES) {
    const out = join(ROOT, 'articles', `${a.slug}.html`)
    writeFileSync(out, articleShell(a))
    console.log('wrote', `articles/${a.slug}.html`)
  }
  syncSitemap(ARTICLES)
  console.log('wrote public/sitemap.xml')
  syncArticlesIndex(ARTICLES)
  console.log('updated articles.html ItemList + #root/noscript lists')
}

main()
