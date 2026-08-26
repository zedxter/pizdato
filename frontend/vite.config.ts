import { readdirSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import type { Connect } from 'vite'

const CLEAN_PAGES = {
  '/issledovanie': '/issledovanie.html',
  '/faq': '/faq.html',
  '/lenta': '/lenta.html',
  '/pizdato': '/pizdato.html',
  '/articles': '/articles.html',
}

const articleHtmlInputs = Object.fromEntries(
  readdirSync('articles')
    .filter((f: string) => f.endsWith('.html'))
    .map((f: string) => [`articles-${f.replace(/\.html$/, '')}`, `articles/${f}`]),
)

/** Map clean URLs to MPA HTML entries in vite dev / preview. */
function cleanPageUrls(): Plugin {
  const rewrite = (url: string): string => {
    if (!url) return url
    const pathOnly = url.split('?')[0].replace(/\/+$/, '') || '/'
    const mapped = CLEAN_PAGES[pathOnly as keyof typeof CLEAN_PAGES]
    if (mapped) {
      return url.replace(url.split('?')[0], mapped)
    }
    if (pathOnly.startsWith('/articles/')) {
      const slug = pathOnly.slice('/articles/'.length)
      if (slug && !slug.includes('/')) {
        return url.replace(url.split('?')[0], `/articles/${slug}.html`)
      }
    }
    return url
  }

  return {
    name: 'pizdato-clean-page-urls',
    configureServer(server) {
      server.middlewares.use((req: Connect.IncomingMessage, _res: unknown, next: Connect.NextFunction) => {
        req.url = rewrite(req.url ?? '') ?? req.url
        next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req: Connect.IncomingMessage, _res: unknown, next: Connect.NextFunction) => {
        req.url = rewrite(req.url ?? '') ?? req.url
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), cleanPageUrls()],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        issledovanie: 'issledovanie.html',
        faq: 'faq.html',
        lenta: 'lenta.html',
        pizdato: 'pizdato.html',
        articles: 'articles.html',
        ...articleHtmlInputs,
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8080',
    },
  },
})
