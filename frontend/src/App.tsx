import { useEffect, useState } from 'react'
import { castVote, fetchStats, type Choice, type Stats } from './api'
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
  const [justVoted, setJustVoted] = useState(false)
  const [quotes, setQuotes] = useState<Wisdom[]>(() => pickQuotes(1))
  const [canVote, setCanVote] = useState(false)

  useEffect(() => {
    let cancelled = false
    let unlockTimer: number | undefined
    fetchStats()
      .then((s) => {
        if (cancelled) return
        setStats(s)
        // Soft UI delay aligned with server session min age (~2s).
        unlockTimer = window.setTimeout(() => {
          if (!cancelled) setCanVote(true)
        }, 2000)
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message)
      })
    return () => {
      cancelled = true
      if (unlockTimer !== undefined) window.clearTimeout(unlockTimer)
    }
  }, [])

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
        <h1 className="brand">pizdato</h1>
        {voted && quotes[0] ? (
          <blockquote className="quote-block hero-quote">
            <p className="quote-text">{quotes[0].text}</p>
            <footer className="quote-footer">
              <cite className="quote-author">{quotes[0].author}</cite>
            </footer>
          </blockquote>
        ) : (
          <p className="tagline">Мир делится на два лагеря. Выбери сторону.</p>
        )}

        {!voted ? (
          <div className={`actions ${pending ? 'is-pending' : ''}`}>
            <button
              type="button"
              className="btn btn-good"
              disabled={pending || !stats || !canVote}
              onClick={() => void vote('pizdato')}
            >
              Сделать пиздато
            </button>
            <button
              type="button"
              className="btn btn-bad"
              disabled={pending || !stats || !canVote}
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

        {error && <p className="error">{error}</p>}
      </main>
    </div>
  )
}
