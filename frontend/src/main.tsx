import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Page />
  </StrictMode>,
)
