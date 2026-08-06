export type Choice = 'pizdato' | 'huyevo'

export interface Stats {
  pizdato: number
  huyevo: number
  total: number
  voted: boolean
  choice?: Choice
}

export async function fetchStats(): Promise<Stats> {
  const res = await fetch('/api/stats', { credentials: 'include' })
  if (!res.ok) {
    throw new Error('Не удалось загрузить статистику')
  }
  return res.json()
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
