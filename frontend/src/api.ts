export type Choice = 'pizdato' | 'huyevo'

export interface Stats {
  pizdato: number
  huyevo: number
  total: number
  voted: boolean
  choice?: Choice
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export async function fetchStats(): Promise<Stats> {
  const res = await fetch('/api/stats', { credentials: 'include' })
  if (!res.ok) {
    throw new Error('Не удалось загрузить статистику')
  }
  return res.json()
}

/** Retries transient failures (e.g. brief SQLite lock → 500). */
export async function fetchStatsWithRetry(attempts = 3): Promise<Stats> {
  const total = Math.max(1, attempts)
  let lastError: Error | undefined

  for (let i = 1; i <= total; i++) {
    try {
      return await fetchStats()
    } catch (e) {
      lastError =
        e instanceof Error ? e : new Error('Не удалось загрузить статистику')
      if (i < total) await sleep(300 * i)
    }
  }

  throw lastError ?? new Error('Не удалось загрузить статистику')
}

export async function castVote(choice: Choice): Promise<Stats> {
  const res = await fetch('/api/vote', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ choice }),
  })
  const data = await res.json()
  if (res.status === 409) {
    return data.stats ?? data
  }
  if (res.status === 429) {
    throw new Error(data.error ?? 'Слишком много попыток. Попробуйте позже.')
  }
  if (res.status === 403) {
    throw new Error(data.error ?? 'Обновите страницу и попробуйте снова.')
  }
  if (!res.ok) {
    throw new Error(data.error ?? 'Ошибка голосования')
  }
  return data
}
