import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchStats, fetchStatsWithRetry, castVote, fetchNewsPage } from '../api'

function mockFetch(data: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(data),
  })
}

describe('fetchStats', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('returns stats on success', async () => {
    const stats = { pizdato: 10, huyevo: 5, total: 15, voted: false }
    vi.mocked(fetch).mockImplementation(mockFetch(stats))

    const result = await fetchStats()
    expect(result).toEqual(stats)
    expect(fetch).toHaveBeenCalledWith('/api/stats', { credentials: 'include' })
  })

  it('throws on non-ok response', async () => {
    vi.mocked(fetch).mockImplementation(mockFetch({ error: 'fail' }, 500))
    await expect(fetchStats()).rejects.toThrow('Не удалось загрузить статистику')
  })
})

describe('fetchStatsWithRetry', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('succeeds on first attempt', async () => {
    const stats = { pizdato: 1, huyevo: 2, total: 3, voted: false }
    vi.mocked(fetch).mockImplementation(mockFetch(stats))
    const result = await fetchStatsWithRetry(3)
    expect(result).toEqual(stats)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('retries on failure and eventually succeeds', async () => {
    const stats = { pizdato: 1, huyevo: 2, total: 3, voted: false }
    vi.mocked(fetch)
      .mockImplementationOnce(mockFetch(null, 500))
      .mockImplementationOnce(mockFetch(null, 500))
      .mockImplementationOnce(mockFetch(stats))

    // Use short 1ms delays internally for faster test execution
    const result = await fetchStatsWithRetry(3)
    expect(result).toEqual(stats)
    expect(fetch).toHaveBeenCalledTimes(3)
  }, 10000)

  it('throws after exhausting all attempts', async () => {
    vi.mocked(fetch).mockImplementation(mockFetch(null, 500))
    await expect(fetchStatsWithRetry(2)).rejects.toThrow('Не удалось загрузить статистику')
    expect(fetch).toHaveBeenCalledTimes(2)
  }, 10000)
})

describe('castVote', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('returns stats on successful vote', async () => {
    const stats = { pizdato: 11, huyevo: 5, total: 16, voted: true, choice: 'pizdato' as const }
    vi.mocked(fetch).mockImplementation(mockFetch(stats, 200))
    const result = await castVote('pizdato')
    expect(result).toEqual(stats)
    expect(fetch).toHaveBeenCalledWith('/api/vote', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ choice: 'pizdato' }),
    })
  })

  it('returns stats on 409 conflict', async () => {
    const stats = { pizdato: 10, huyevo: 5, total: 15, voted: true, choice: 'pizdato' as const }
    vi.mocked(fetch).mockImplementation(mockFetch({ stats }, 409))
    const result = await castVote('pizdato')
    expect(result).toEqual(stats)
  })

  it('throws on 429 too many requests', async () => {
    vi.mocked(fetch).mockImplementation(mockFetch({ error: 'Too fast' }, 429))
    await expect(castVote('pizdato')).rejects.toThrow()
  })

  it('throws on 403 forbidden', async () => {
    vi.mocked(fetch).mockImplementation(mockFetch({ error: 'Blocked' }, 403))
    await expect(castVote('huyevo')).rejects.toThrow()
  })

  it('throws on unknown error', async () => {
    vi.mocked(fetch).mockImplementation(mockFetch({ error: 'Boom' }, 418))
    await expect(castVote('pizdato')).rejects.toThrow()
  })
})

describe('fetchNewsPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('fetches news with default limit', async () => {
    vi.mocked(fetch).mockImplementation(
      mockFetch({ items: [{ id: 1, title: 'Test' }], next_before_id: null }),
    )
    const result = await fetchNewsPage()
    expect(result.items).toHaveLength(1)
    expect(fetch).toHaveBeenCalledWith('/api/news?limit=20')
  })

  it('passes before_id when provided', async () => {
    vi.mocked(fetch).mockImplementation(
      mockFetch({ items: [], next_before_id: null }),
    )
    await fetchNewsPage({ limit: 10, beforeId: 42 })
    expect(fetch).toHaveBeenCalledWith('/api/news?limit=10&before_id=42')
  })

  it('throws on non-ok response', async () => {
    vi.mocked(fetch).mockImplementation(mockFetch(null, 500))
    await expect(fetchNewsPage()).rejects.toThrow('Не удалось загрузить ленту')
  })
})