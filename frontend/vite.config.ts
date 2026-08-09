// @ts-nocheck — vite config; Connect typings for req.url vary by @types/node presence
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const CLEAN_PAGES = {
  '/issledovanie': '/issledovanie.html',
  '/faq': '/faq.html',
  '/lenta': '/lenta.html',
  '/how': '/how.html',
}

/** Map clean URLs to MPA HTML entries in vite dev / preview. */
function cleanPageUrls() {
  const rewrite = (url) => {
    if (!url) return url
    const pathOnly = url.split('?')[0].replace(/\/+$/, '') || '/'
    const target = CLEAN_PAGES[pathOnly]
    if (target) {
      return url.replace(url.split('?')[0], target)
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
        how: 'how.html',
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8080',
    },
  },
})
