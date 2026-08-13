import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import './index.css'
import App from './App.tsx'
import Articles from './Articles.tsx'
import Essay from './Essay.tsx'
import Faq from './Faq.tsx'
import Feed from './Feed.tsx'
import { bindTelegramOutboundTracking, initMetrika } from './metrika.ts'
import PizdatoBrand from './PizdatoBrand.tsx'

initMetrika()
bindTelegramOutboundTracking()

const path = window.location.pathname.replace(/\/+$/, '') || '/'
const Page =
  path === '/issledovanie'
    ? Essay
    : path === '/faq'
      ? Faq
      : path === '/lenta'
        ? Feed
        : path === '/pizdato'
          ? PizdatoBrand
          : path === '/articles' || path.startsWith('/articles/')
            ? Articles
            : App

const rootEl = document.getElementById('root')!
flushSync(() => {
  createRoot(rootEl).render(
    <StrictMode>
      <Page />
    </StrictMode>,
  )
})
// Reveal #root after React replaced the SEO shell (see inline head CSS).
document.documentElement.classList.add('app-ready')
