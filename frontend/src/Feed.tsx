import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchNewsPage, type NewsItem } from './api'
import { SiteFooter } from './SiteFooter'
import { SiteNav } from './SiteNav'
import './Essay.css'

const TITLE = 'Лента голосов — pizdato'
const DESCRIPTION =
  'Новости, которые уже сдвинули общий счёт человечества: пиздато или хуёво — и коротко почему.'

function formatWhen(isoLike: string): string {
  // SQLite datetime('now') → "YYYY-MM-DD HH:MM:SS" (UTC-ish)
  const normalized = isoLike.includes('T') ? isoLike : isoLike.replace(' ', 'T') + 'Z'
  const d = new Date(normalized)
  if (Number.isNaN(d.getTime())) return isoLike
  return d.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Feed() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [nextBefore, setNextBefore] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const loadingMoreRef = useRef(false)

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

  const loadInitial = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const page = await fetchNewsPage({ limit: 20 })
      setItems(page.items)
      setNextBefore(page.next_before_id)
      setDone(page.next_before_id == null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadInitial()
  }, [loadInitial])

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || done || nextBefore == null) return
    loadingMoreRef.current = true
    setLoadingMore(true)
    try {
      const page = await fetchNewsPage({ limit: 20, beforeId: nextBefore })
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.id))
        return [...prev, ...page.items.filter((i) => !seen.has(i.id))]
      })
      setNextBefore(page.next_before_id)
      setDone(page.next_before_id == null || page.items.length === 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки')
    } finally {
      setLoadingMore(false)
      loadingMoreRef.current = false
    }
  }, [done, nextBefore])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || done) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void loadMore()
        }
      },
      { rootMargin: '240px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [loadMore, done, items.length])

  return (
    <div className="page page-essay page-feed">
      <div className="noise" aria-hidden="true" />
      <div className="glow glow-a" aria-hidden="true" />
      <div className="glow glow-b" aria-hidden="true" />

      <SiteNav current="lenta" />

      <article className="essay feed">
        <header className="essay-masthead">
          <p className="essay-kicker">Лента</p>
          <div className="essay-title-wrap">
            <h1>Лента голосов</h1>
          </div>
          <p className="essay-dek">
            Новости, которые уже успели сдвинуть общий счёт человечества:
            заголовок, вердикт пиздато или хуёво — и коротко почему.
          </p>
        </header>

        {loading && <p className="feed-status">Загрузка…</p>}
        {error && (
          <div className="feed-error">
            <p>{error}</p>
            <button type="button" className="retry-btn" onClick={() => void loadInitial()}>
              Обновить
            </button>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <p className="feed-status">Пока пусто — скоро появятся первые вердикты.</p>
        )}

        <div className="feed-list">
          {items.map((item) => (
            <article key={item.id} className="feed-card">
              <div className="feed-card-body">
                <time className="feed-when" dateTime={item.created_at}>
                  {formatWhen(item.created_at)}
                </time>
                <h2 className="feed-title">
                  <a href={item.url} target="_blank" rel="noopener noreferrer">
                    {item.title}
                  </a>
                </h2>
                <p
                  className={`feed-verdict ${
                    item.verdict === 'pizdato' ? 'is-good' : 'is-bad'
                  }`}
                >
                  Вердикт: {item.verdict === 'pizdato' ? 'пиздато' : 'хуёво'}
                </p>
                <p className="feed-reason">Почему: {item.reason}</p>
              </div>
              <a
                className={`feed-thumb${item.image_url ? '' : ' is-fallback'}`}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={-1}
                aria-hidden="true"
              >
                <img
                  src={item.image_url || '/logo.png'}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  referrerPolicy={item.image_url ? 'no-referrer' : undefined}
                  onError={(e) => {
                    const img = e.currentTarget
                    if (img.dataset.fallback === '1') return
                    img.dataset.fallback = '1'
                    img.src = '/logo.png'
                    img.closest('.feed-thumb')?.classList.add('is-fallback')
                  }}
                />
              </a>
            </article>
          ))}
        </div>

        <div ref={sentinelRef} className="feed-sentinel" aria-hidden="true" />
        {loadingMore && <p className="feed-status">Ещё…</p>}
        {done && items.length > 0 && (
          <p className="feed-status feed-end">Это всё, что есть в ленте.</p>
        )}
      </article>

      <SiteFooter current="lenta" cta />
    </div>
  )
}
