import { useEffect } from 'react'
import {
  essayDekHtml,
  essayHtml,
  essayTitleHtml,
  essayTocHtml,
} from './essayHtml'
import './App.css'
import './Essay.css'

const TITLE =
  'Пиздато и хуёво: исследование бинарных противостояний — pizdato'
const DESCRIPTION =
  'Эссе о том, как культура делит мир надвое — от добра и зла до пиздато и хуёво. Источники, теория и две кнопки.'

export default function Essay() {
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
    return () => {
      document.title = prevTitle
      if (prevDesc !== null) meta?.setAttribute('content', prevDesc)
    }
  }, [])

  return (
    <div className="page page-essay">
      <div className="noise" aria-hidden="true" />
      <div className="glow glow-a" aria-hidden="true" />
      <div className="glow glow-b" aria-hidden="true" />

      <header className="essay-top">
        <a className="essay-brand" href="/">
          <img
            className="essay-brand-mark"
            src="/logo.png"
            width={48}
            height={48}
            alt=""
            decoding="async"
          />
          <span className="essay-brand-name">pizdato</span>
        </a>
        <a className="essay-back" href="/">
          К голосованию
        </a>
      </header>

      <article className="essay">
        <header className="essay-masthead">
          <p className="essay-kicker">Эссе-исследование</p>
          <div
            className="essay-title-wrap"
            dangerouslySetInnerHTML={{ __html: `<h1>${essayTitleHtml}</h1>` }}
          />
          <div
            className="essay-dek-wrap"
            dangerouslySetInnerHTML={{
              __html: `<p class="essay-dek">${essayDekHtml}</p>`,
            }}
          />
          <p className="essay-byline">
            <span>pizdato.net</span>
            <span className="footer-sep" aria-hidden="true">
              ·
            </span>
            <span>~12 стр.</span>
            <span className="footer-sep" aria-hidden="true">
              ·
            </span>
            <time dateTime="2026-08-08">август 2026</time>
          </p>
        </header>

        <figure className="essay-hero-figure">
          <img
            src="/essay/essay-hero.jpg"
            alt="Два полюса: пиздато и хуёво как геометрический раскол мира"
            width={1400}
            height={933}
            decoding="async"
            fetchPriority="high"
          />
          <figcaption>
            Мир делится на два лагеря — не только в мемах, но и в истории идей.
          </figcaption>
        </figure>

        <div
          className="essay-toc-wrap"
          dangerouslySetInnerHTML={{ __html: essayTocHtml }}
        />

        <div
          className="essay-body"
          dangerouslySetInnerHTML={{ __html: essayHtml }}
        />
      </article>

      <footer className="site-footer essay-footer">
        <p className="essay-cta">
          Мир ждёт твоего голоса. Остальное — уже легенда:
        </p>
        <a className="essay-cta-link" href="/">
          https://pizdato.net
        </a>
        <div className="footer-nav">
          <a
            className="channel-link"
            href="https://t.me/pizdato_net"
            target="_blank"
            rel="noopener noreferrer me"
          >
            Telegram-канал <span aria-hidden="true">@pizdato_net</span>
          </a>
        </div>
      </footer>
    </div>
  )
}
