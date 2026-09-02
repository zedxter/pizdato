import { useEffect, useState } from 'react'
import { fetchStats, type Stats } from './api'
import { pickQuotes, type Wisdom } from './quotes'
import { SiteFooter } from './SiteFooter'
import { SiteNav } from './SiteNav'
import './Mascot404.css'

const TITLE = '404 — ничего нет | pizdato.net'
const DESCRIPTION = 'Страница не найдена. Забрёл в хуёвый угол — вернись на главную и проголосуй.'

export default function Mascot404() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [wisdom] = useState<Wisdom | null>(() => pickQuotes(1)[0] ?? null)

  useEffect(() => {
    const prevTitle = document.title
    document.title = TITLE
    let meta = document.querySelector('meta[name="description"]')
    const prevDesc = meta?.getAttribute('content') ?? null
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'description')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', DESCRIPTION)
    let robots = document.querySelector('meta[name="robots"]')
    const prevRobots = robots?.getAttribute('content') ?? null
    if (!robots) {
      robots = document.createElement('meta')
      robots.setAttribute('name', 'robots')
      document.head.appendChild(robots)
    }
    robots.setAttribute('content', 'noindex, follow')
    return () => {
      document.title = prevTitle
      if (prevDesc !== null) meta?.setAttribute('content', prevDesc)
      if (prevRobots !== null) robots?.setAttribute('content', prevRobots)
      else robots?.remove()
    }
  }, [])

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch(() => { /* silently fail, 404 page is forgiving */ })
  }, [])

  const total = stats?.total ?? 0
  const pizdatoPct = total > 0 ? Math.round(((stats?.pizdato ?? 0) / total) * 100) : 0
  const huyevoPct = total > 0 ? Math.round(((stats?.huyevo ?? 0) / total) * 100) : 0

  return (
    <div className="page page-404">
      <div className="noise" aria-hidden="true" />
      <div className="glow glow-a" aria-hidden="true" />
      <div className="glow glow-b" aria-hidden="true" />

      <SiteNav current="404" />

      <main className="mascot-404">
        <img
          className="mascot-img"
          src="/mascot/mascot-404.webp"
          alt="Дядя Миша"
          width={256}
          height={256}
          decoding="async"
        />

        <h1 className="mascot-404-title">404</h1>
        <p className="mascot-404-sub">Ты забрёл в хуёвый угол</p>

        {wisdom && (
          <blockquote className="mascot-404-quote">
            <p className="mascot-404-quote-text">{wisdom.text}</p>
            <footer className="mascot-404-quote-author">{wisdom.author}</footer>
          </blockquote>
        )}

        <div className="mascot-404-actions">
          <a href="/" className="btn btn-good">На главную</a>
          <a href="/lenta" className="btn btn-bad">Лента голосов</a>
        </div>

        {total > 0 && (
          <p className="mascot-404-stats">
            У человечества {pizdatoPct}% пиздато · {huyevoPct}% хуёво · {total} голосов
          </p>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
