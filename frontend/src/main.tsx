import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Essay from './Essay.tsx'
import Faq from './Faq.tsx'

const path = window.location.pathname.replace(/\/+$/, '') || '/'
const Page =
  path === '/issledovanie' ? Essay : path === '/faq' ? Faq : App

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Page />
  </StrictMode>,
)
