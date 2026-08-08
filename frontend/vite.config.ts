// @ts-nocheck — vite config; Connect typings for req.url vary by @types/node presence
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** Map clean URLs to MPA HTML entries in vite dev / preview. */
function cleanEssayUrl() {
  const rewrite = (url) => {
    if (!url) return url
    const pathOnly = url.split('?')[0]
    if (pathOnly === '/issledovanie' || pathOnly === '/issledovanie/') {
      return url.replace(pathOnly, '/issledovanie.html')
    }
    return url
  }

  return {
    name: 'pizdato-clean-essay-url',
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
  plugins: [react(), cleanEssayUrl()],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        issledovanie: 'issledovanie.html',
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8080',
    },
  },
})
