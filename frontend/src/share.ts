import type { Choice, Stats } from './api'

const SITE_URL = 'https://pizdato.net/'

function pct(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((part / total) * 100)
}

export function buildShareText(stats: Stats): string {
  const p = pct(stats.pizdato, stats.total)
  const h = pct(stats.huyevo, stats.total)
  const score = `Сейчас у человечества: пиздато ${p}% · хуёво ${h}% (всего ${stats.total}).`

  if (stats.choice === 'pizdato') {
    return `Я сделал пиздато на pizdato.net.\n${score}\nА ты? ${SITE_URL}`
  }
  if (stats.choice === 'huyevo') {
    return `Я сознательно сделал хуёво на pizdato.net.\n${score}\nА ты? ${SITE_URL}`
  }
  return `Мир делится на пиздато и хуёво.\n${score}\nВыбери сторону: ${SITE_URL}`
}

export function telegramShareUrl(text: string): string {
  const params = new URLSearchParams({ url: SITE_URL, text })
  return `https://t.me/share/url?${params.toString()}`
}

export function vkShareUrl(text: string, choice?: Choice): string {
  const title =
    choice === 'pizdato'
      ? 'Я сделал пиздато'
      : choice === 'huyevo'
        ? 'Я сделал хуёво'
        : 'pizdato — выбери сторону'
  const params = new URLSearchParams({
    url: SITE_URL,
    title,
    comment: text,
  })
  return `https://vk.com/share.php?${params.toString()}`
}

export async function copyShareText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.left = '-9999px'
  document.body.appendChild(area)
  area.select()
  document.execCommand('copy')
  document.body.removeChild(area)
}

export async function nativeShare(text: string): Promise<boolean> {
  if (!navigator.share) return false
  try {
    await navigator.share({ title: 'pizdato', text, url: SITE_URL })
    return true
  } catch {
    return false
  }
}
