import { useEffect, useState } from 'react'
import confetti from 'canvas-confetti'
import { castVote, fetchStatsWithRetry, type Choice, type Stats } from './api'
import { GOAL_VOTE_SUCCESS, reachGoal } from './metrika'
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

const GOOD_COLORS = ['#3dff9a', '#22d97f', '#f2ff57', '#ffffff', '#7dffc8']
const BAD_COLORS = ['#ff4d3d', '#ff7a3d', '#ffd23d', '#ffffff', '#ff8a7d']

function buzz(durationMs: number | number[] = 60) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(durationMs)
    }
  } catch {
    /* haptics not supported */
  }
}

function celebrate(choice: Choice) {
  const good = choice === 'pizdato'
  const colors = good ? GOOD_COLORS : BAD_COLORS
  // Central burst: two-sided cannons instead of a one-sided origin.
  const tick = 40

  // Haptics: short "tap" immediately, then a stronger pulse with the finale.
  buzz(30)
  window.setTimeout(() => buzz([20, 30, 20]), tick * 2)

  // Left cannon
  void confetti({
    particleCount: 55,
    spread: 60,
    startVelocity: 45,
    angle: 60,
    ticks: 190,
    origin: { x: 0.5, y: 0.6 },
    colors,
    scalar: 1.05,
    zIndex: 9999,
    disableForReducedMotion: true,
  })
  // Right cannon
  void confetti({
    particleCount: 55,
    spread: 60,
    startVelocity: 45,
    angle: 120,
    ticks: 190,
    origin: { x: 0.5, y: 0.6 },
    colors,
    scalar: 1.05,
    zIndex: 9999,
    disableForReducedMotion: true,
  })

  window.setTimeout(() => {
    // Rising fountains, both sides
    void confetti({
      particleCount: 40,
      spread: 90,
      startVelocity: 55,
      gravity: 0.9,
      ticks: 200,
      origin: { x: 0.3, y: 0.75 },
      colors,
      shapes: ['square', 'circle'],
      zIndex: 9999,
      disableForReducedMotion: true,
    })
    void confetti({
      particleCount: 40,
      spread: 90,
      startVelocity: 55,
      gravity: 0.9,
      ticks: 200,
      origin: { x: 0.7, y: 0.75 },
      colors,
      shapes: ['square', 'circle'],
      zIndex: 9999,
      disableForReducedMotion: true,
    })
  }, tick)

  window.setTimeout(() => {
    // Finale: confetti rain from the top across the whole width
    void confetti({
      particleCount: 120,
      spread: 160,
      startVelocity: 25,
      gravity: 1.1,
      ticks: 240,
      origin: { x: 0.5, y: -0.08 },
      colors: good ? ['#3dff9a', '#ffffff'] : ['#ff4d3d', '#ffffff'],
      shapes: ['circle'],
      zIndex: 9999,
      disableForReducedMotion: true,
    })
  }, tick * 3)
}

function AnimatedCounter({ from, to, label }: { from: number; to: number; label: string }) {
  const [val, setVal] = useState(from)
  useEffect(() => {
    if (from === to) return
    const duration = 1200
    const start = performance.now()
    let raf: number
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1)
      // ease-out quad
      const eased = 1 - (1 - t) * (1 - t)
      setVal(Math.round(from + (to - from) * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [from, to])
  return <span className="counter-num">{val}<span className="counter-pct">%</span> {label}</span>
}

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
      celebrate(choice)
      setQuotes(pickQuotes(QUOTE_COUNT))
      setQuoteIndex(0)
      reachGoal(GOAL_VOTE_SUCCESS)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setPending(false)
    }
  }

  const pizdatoPct = pct(stats?.pizdato ?? 0, stats?.total ?? 0)
  const huyevoPct = pct(stats?.huyevo ?? 0, stats?.total ?? 0)
  const activeQuote = quotes[quoteIndex] ?? quotes[0]

  // Living background: glow intensity follows the vote ratio
  const total = stats?.total ?? 0
  const goodRatio = total > 0 ? (stats?.pizdato ?? 0) / total : 0.5
  const glowA = 0.2 + goodRatio * 0.45
  const glowB = 0.2 + (1 - goodRatio) * 0.45

  return (
    <div className="page">
      <div className="noise" aria-hidden="true" />
      <div className="glow glow-a" aria-hidden="true" style={{ opacity: glowA }} />
      <div className="glow glow-b" aria-hidden="true" style={{ opacity: glowB }} />

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

            {justVoted && stats && (
              <p className="impact-bar">
                {stats.choice === 'pizdato' ? (
                  <>
                    <AnimatedCounter from={0} to={pizdatoPct} label="пиздато" />
                    <span className="impact-vs">vs</span>
                    <span className="impact-counter">{huyevoPct}% хуёво</span>
                  </>
                ) : (
                  <>
                    <AnimatedCounter from={0} to={huyevoPct} label="хуёво" />
                    <span className="impact-vs">vs</span>
                    <span className="impact-counter">{pizdatoPct}% пиздато</span>
                  </>
                )}
              </p>
            )}

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
