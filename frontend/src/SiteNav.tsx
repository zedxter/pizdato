import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { NAV_LINKS, type NavId } from './nav'
import './SiteNav.css'

export type { NavId }

type Props = {
  current: NavId
}

export function SiteNav({ current }: Props) {
  const [open, setOpen] = useState(false)
  const [panelTop, setPanelTop] = useState(0)
  const panelId = useId()
  const rootRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const syncTop = () => {
      const el = rootRef.current
      if (!el) return
      setPanelTop(el.getBoundingClientRect().bottom)
    }
    syncTop()
    window.addEventListener('resize', syncTop)
    window.addEventListener('scroll', syncTop, { passive: true })
    return () => {
      window.removeEventListener('resize', syncTop)
      window.removeEventListener('scroll', syncTop)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node
      if (rootRef.current?.contains(t)) return
      const panel = document.getElementById(panelId)
      if (panel?.contains(t)) return
      setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointer)
    }
  }, [open, panelId])

  return (
    <header className="site-nav" ref={rootRef}>
      <div className="site-nav-inner">
        <a className="site-nav-brand" href="/" aria-label="pizdato — на главную">
          <img
            className="site-nav-mark"
            src="/logo.png"
            width={36}
            height={36}
            alt=""
            decoding="async"
          />
          <span className="site-nav-name">pizdato</span>
        </a>

        <nav className="site-nav-desktop" aria-label="Разделы сайта">
          <ul className="site-nav-list">
            {NAV_LINKS.map((link) => {
              const active = link.id === current
              return (
                <li key={link.id}>
                  <a
                    href={link.href}
                    className={`site-nav-link${active ? ' is-active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    {link.label}
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>

        <button
          type="button"
          className={`site-nav-toggle${open ? ' is-open' : ''}`}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => {
            if (rootRef.current) {
              setPanelTop(rootRef.current.getBoundingClientRect().bottom)
            }
            setOpen((v) => !v)
          }}
        >
          <span className="site-nav-toggle-icon" aria-hidden="true" />
          <span className="site-nav-toggle-label">Меню</span>
        </button>
      </div>

      {open &&
        createPortal(
          <div
            id={panelId}
            className="site-nav-panel is-open"
            style={{ top: panelTop }}
            role="dialog"
            aria-label="Меню сайта"
          >
            <nav aria-label="Разделы сайта">
              <ul className="site-nav-panel-list">
                {NAV_LINKS.map((link) => {
                  const active = link.id === current
                  return (
                    <li key={link.id}>
                      <a
                        href={link.href}
                        className={`site-nav-panel-link${active ? ' is-active' : ''}`}
                        aria-current={active ? 'page' : undefined}
                        onClick={() => setOpen(false)}
                      >
                        {link.label}
                      </a>
                    </li>
                  )
                })}
                <li>
                  <a
                    className="site-nav-panel-link site-nav-panel-ext"
                    href="https://t.me/pizdato_net"
                    target="_blank"
                    rel="noopener noreferrer me"
                    onClick={() => setOpen(false)}
                  >
                    Telegram
                  </a>
                </li>
              </ul>
            </nav>
          </div>,
          document.body,
        )}
    </header>
  )
}
