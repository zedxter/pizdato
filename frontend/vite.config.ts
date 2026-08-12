// @ts-nocheck — vite config; Connect typings for req.url vary by @types/node presence
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const CLEAN_PAGES = {
  '/issledovanie': '/issledovanie.html',
  '/faq': '/faq.html',
  '/lenta': '/lenta.html',
  '/pizdato': '/pizdato.html',
  '/articles': '/articles.html',
}

/** Map clean URLs to MPA HTML entries in vite dev / preview. */
function cleanPageUrls() {
  const rewrite = (url) => {
    if (!url) return url
    const pathOnly = url.split('?')[0].replace(/\/+$/, '') || '/'
    const mapped = CLEAN_PAGES[pathOnly]
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
      server.middlewares.use((req, _res, next) => {
        req.url = rewrite(req.url) ?? req.url
        next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        req.url = rewrite(req.url) ?? req.url
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
        'articles-chto-znachit-pizdato': 'articles/chto-znachit-pizdato.html',
        'articles-pizdato-i-huyevo': 'articles/pizdato-i-huyevo.html',
        'articles-zachem-odin-golos': 'articles/zachem-odin-golos.html',
        'articles-tonkaya-gran': 'articles/tonkaya-gran-mezhdu-pizdato-i-pizdec.html',
        'articles-sindrom-otlozhennoj-zhizni': 'articles/sindrom-otlozhennoj-zhizni.html',
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8080',
    },
  },
})
