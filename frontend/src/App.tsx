import { useEffect, useState } from 'react'
import { castVote, fetchStatsWithRetry, type Choice, type Stats } from './api'
import { pickQuotes, type Wisdom } from './quotes'
import { SharePanel } from './SharePanel'
import { SiteFooter } from './SiteFooter'
import { SiteNav } from './SiteNav'
import './App.css'

function pct(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((part / total) * 100)
}

const QUOTE_COUNT = 3
const QUOTE_ROTATE_MS = 6500

function QuoteCarousel({
  quotes,
  index,
  onIndexChange,
}: {
  quotes: Wisdom[]
  index: number
  onIndexChange: (next: number) => void
}) {
  const n = quotes.length
  const quote = quotes[index]
  if (!quote || n === 0) return null

  const go = (delta: number) => {
    onIndexChange((index + delta + n) % n)
  }

  return (
    <div
      className="quote-carousel"
      role="region"
      aria-roledescription="carousel"
      aria-label="Мудрость дня"
    >
      <div className="quote-carousel-stage">
        {n > 1 && (
          <button
            type="button"
            className="quote-carousel-btn quote-carousel-btn-prev"
            aria-label="Предыдущая цитата"
            onClick={() => go(-1)}
          >
            ‹
          </button>
        )}

        <blockquote className="quote-block hero-quote" key={index}>
          <p className="quote-text">{quote.text}</p>
          <footer className="quote-footer">
            <cite className="quote-author">{quote.author}</cite>
          </footer>
        </blockquote>

        {n > 1 && (
          <button
            type="button"
            className="quote-carousel-btn quote-carousel-btn-next"
            aria-label="Следующая цитата"
            onClick={() => go(1)}
          >
            ›
          </button>
        )}
      </div>

      {n > 1 && (
        <div className="quote-carousel-dots" role="tablist" aria-label="Цитаты">
          {quotes.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Цитата ${i + 1} из ${n}`}
              className={`quote-carousel-dot${i === index ? ' is-active' : ''}`}
              onClick={() => onIndexChange(i)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [loadingStats, setLoadingStats] = useState(true)
  const [justVoted, setJustVoted] = useState(false)
  const [quotes, setQuotes] = useState<Wisdom[]>(() => pickQuotes(QUOTE_COUNT))
  const [quoteIndex, setQuoteIndex] = useState(0)
  const [canVote, setCanVote] = useState(false)
  const [statsReload, setStatsReload] = useState(0)

  useEffect(() => {
    let cancelled = false
    let unlockTimer: number | undefined

    setLoadingStats(true)
    setError(null)
    setCanVote(false)

    void fetchStatsWithRetry(5)
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

  const voted = stats?.voted ?? false

  useEffect(() => {
    if (!voted || quotes.length < 2) return
    const id = window.setInterval(() => {
      setQuoteIndex((i) => (i + 1) % quotes.length)
    }, QUOTE_ROTATE_MS)
    return () => window.clearInterval(id)
  }, [voted, quotes, quoteIndex])

  async function vote(choice: Choice) {
    if (stats?.voted || pending || !canVote) return
    setError(null)
    setPending(true)
    try {
      const next = await castVote(choice)
      setStats(next)
      setJustVoted(true)
      setQuotes(pickQuotes(QUOTE_COUNT))
      setQuoteIndex(0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setPending(false)
    }
  }

  const pizdatoPct = pct(stats?.pizdato ?? 0, stats?.total ?? 0)
  const huyevoPct = pct(stats?.huyevo ?? 0, stats?.total ?? 0)
  const activeQuote = quotes[quoteIndex] ?? quotes[0]

  return (
    <div className="page">
      <div className="noise" aria-hidden="true" />
      <div className="glow glow-a" aria-hidden="true" />
      <div className="glow glow-b" aria-hidden="true" />

      <SiteNav current="home" />

      <main className="hero">
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
        {voted && activeQuote ? (
          <QuoteCarousel
            quotes={quotes}
            index={quoteIndex}
            onIndexChange={setQuoteIndex}
          />
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

            {stats && activeQuote && (
              <SharePanel stats={stats} wisdom={activeQuote} />
            )}
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

      <SiteFooter current="home" />
    </div>
  )
}
