import { useEffect, useState } from 'react'
import { castVote, fetchStatsWithRetry, type Choice, type Stats } from './api'
import { pickQuotes, type Wisdom } from './quotes'
import { SharePanel } from './SharePanel'
import './App.css'

function pct(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((part / total) * 100)
}

export default function App() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [loadingStats, setLoadingStats] = useState(true)
  const [justVoted, setJustVoted] = useState(false)
  const [quotes, setQuotes] = useState<Wisdom[]>(() => pickQuotes(1))
  const [canVote, setCanVote] = useState(false)
  const [statsReload, setStatsReload] = useState(0)

  useEffect(() => {
    let cancelled = false
    let unlockTimer: number | undefined

    setLoadingStats(true)
    setError(null)
    setCanVote(false)

    void fetchStatsWithRetry(3)
      .then((s) => {
        if (cancelled) return
        setStats(s)
        // Soft UI delay aligned with server session min age (~2s).
        unlockTimer = window.setTimeout(() => {
          if (!cancelled) setCanVote(true)
        }, 2000)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setStats(null)
        setError(
          e instanceof Error ? e.message : 'Не удалось загрузить статистику',
        )
      })
      .finally(() => {
        if (!cancelled) setLoadingStats(false)
      })

    return () => {
      cancelled = true
      if (unlockTimer !== undefined) window.clearTimeout(unlockTimer)
    }
  }, [statsReload])

  async function vote(choice: Choice) {
    if (stats?.voted || pending || !canVote) return
    setError(null)
    setPending(true)
    try {
      const next = await castVote(choice)
      setStats(next)
      setJustVoted(true)
      setQuotes(pickQuotes(1))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setPending(false)
    }
  }

  const voted = stats?.voted ?? false
  const pizdatoPct = pct(stats?.pizdato ?? 0, stats?.total ?? 0)
  const huyevoPct = pct(stats?.huyevo ?? 0, stats?.total ?? 0)

  return (
    <div className="page">
      <div className="noise" aria-hidden="true" />
      <div className="glow glow-a" aria-hidden="true" />
      <div className="glow glow-b" aria-hidden="true" />

      <main className="hero">
        <p className="eyebrow">pizdato.net</p>
        <div className="brand-lockup">
          <img
            className="brand-mark"
            src="/logo.png"
            width={160}
            height={160}
            alt=""
            decoding="async"
          />
          <h1 className="brand">pizdato</h1>
        </div>
        {voted && quotes[0] ? (
          <blockquote className="quote-block hero-quote">
            <p className="quote-text">{quotes[0].text}</p>
            <footer className="quote-footer">
              <cite className="quote-author">{quotes[0].author}</cite>
            </footer>
          </blockquote>
        ) : (
          <>
            <p className="tagline">Мир делится на два лагеря.</p>
            <p className="chance-note">
              У тебя только один шанс повлиять на этот мир — выбирай с умом.
            </p>
          </>
        )}

        {!voted ? (
          <div className={`actions ${pending ? 'is-pending' : ''}`}>
            <button
              type="button"
              className="btn btn-good"
              disabled={pending || !stats || !canVote || loadingStats}
              onClick={() => void vote('pizdato')}
            >
              Сделать пиздато
            </button>
            <button
              type="button"
              className="btn btn-bad"
              disabled={pending || !stats || !canVote || loadingStats}
              onClick={() => void vote('huyevo')}
            >
              Сделать хуёво
            </button>
          </div>
        ) : (
          <section className={`results ${justVoted ? 'reveal' : ''}`} aria-live="polite">
            <p className="voted-note">
              {stats?.choice === 'pizdato'
                ? 'Ты сделал этот мир чуточку пиздатее. Спасибо, герой.'
                : stats?.choice === 'huyevo'
                  ? 'Ты сознательно сделал хуёво. Смелость тоже считается.'
                  : 'Вы уже проголосовали.'}
            </p>

            <p className="stats-heading">
              Вот как сейчас обстоят дела у человечества:
            </p>

            <div className="bars">
              <div className="bar-row">
                <div className="bar-meta">
                  <span>Пиздато</span>
                  <span>
                    {stats?.pizdato ?? 0} · {pizdatoPct}%
                  </span>
                </div>
                <div className="track">
                  <div
                    className="fill fill-good"
                    style={{ width: `${pizdatoPct}%` }}
                  />
                </div>
              </div>
              <div className="bar-row">
                <div className="bar-meta">
                  <span>Хуёво</span>
                  <span>
                    {stats?.huyevo ?? 0} · {huyevoPct}%
                  </span>
                </div>
                <div className="track">
                  <div
                    className="fill fill-bad"
                    style={{ width: `${huyevoPct}%` }}
                  />
                </div>
              </div>
            </div>

            <p className="total">Всего голосов: {stats?.total ?? 0}</p>

            {stats && quotes[0] && <SharePanel stats={stats} wisdom={quotes[0]} />}
          </section>
        )}

        {error && (
          <div className="error-block">
            <p className="error">{error}</p>
            <button
              type="button"
              className="retry-btn"
              disabled={loadingStats}
              onClick={() => setStatsReload((n) => n + 1)}
            >
              {loadingStats ? 'Загрузка…' : 'Обновить'}
            </button>
          </div>
        )}
      </main>

      <footer className="site-footer">
        <div className="footer-nav">
          <a className="channel-link" href="/issledovanie">
            Исследование
          </a>
          <span className="footer-sep" aria-hidden="true">
            ·
          </span>
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
