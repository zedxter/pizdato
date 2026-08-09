import { NAV_LINKS, type NavId } from './nav'

type Props = {
  current?: NavId
  /** Essay-style CTA above the link row */
  cta?: boolean
}

export function SiteFooter({ current, cta = false }: Props) {
  return (
    <footer className={`site-footer${cta ? ' essay-footer' : ''}`}>
      {cta && (
        <>
          <p className="essay-cta">
            Мир ждёт твоего голоса. Остальное — уже легенда:
          </p>
          <a className="essay-cta-link" href="/">
            https://pizdato.net
          </a>
        </>
      )}
      <div className="footer-nav">
        {NAV_LINKS.map((link, i) => {
          const active = link.id === current
          return (
            <span key={link.id} className="footer-nav-item">
              {i > 0 && (
                <span className="footer-sep" aria-hidden="true">
                  ·
                </span>
              )}
              <a
                className={`channel-link${active ? ' is-current' : ''}`}
                href={link.href}
                aria-current={active ? 'page' : undefined}
              >
                {link.label}
              </a>
            </span>
          )
        })}
        <span className="footer-nav-item">
          <span className="footer-sep" aria-hidden="true">
            ·
          </span>
          <a
            className="channel-link"
            href="https://t.me/pizdato_net"
            target="_blank"
            rel="noopener noreferrer me"
          >
            Telegram <span aria-hidden="true">@pizdato_net</span>
          </a>
        </span>
      </div>
    </footer>
  )
}
