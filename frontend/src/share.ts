import type { Choice, Stats } from './api'
import type { Wisdom } from './quotes'

const SITE_URL = 'https://pizdato.net/'

function pct(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((part / total) * 100)
}

export function buildShareText(stats: Stats, wisdom?: Wisdom): string {
  const p = pct(stats.pizdato, stats.total)
  const h = pct(stats.huyevo, stats.total)
  const score = `Сейчас у человечества: пиздато ${p}% · хуёво ${h}% (всего ${stats.total}).`
  const quote = wisdom ? `\n\n«${wisdom.text}»\n— ${wisdom.author}` : ''

  if (stats.choice === 'pizdato') {
    return `Я сделал пиздато на pizdato.net.\n${score}${quote}\n\nА ты?`
  }
  if (stats.choice === 'huyevo') {
    return `Я сознательно сделал хуёво на pizdato.net.\n${score}${quote}\n\nА ты?`
  }
  return `Мир делится на пиздато и хуёво.\n${score}${quote}\n\nВыбери сторону.`
}

/** Text for Telegram/VK/native share — URL goes via share `url` param, not duplicated here. */
export function buildQuoteShareText(wisdom: Wisdom): string {
  return `Мудрость дня с pizdato.net:\n\n«${wisdom.text}»\n— ${wisdom.author}`
}

/** Clipboard version includes the link once. */
export function buildQuoteCopyText(wisdom: Wisdom): string {
  return `${buildQuoteShareText(wisdom)}\n\n${SITE_URL}`
}

/** Clip: vote-result share with the link once (A2 «Поделиться результатом»). */
export function buildShareCopyText(stats: Stats, wisdom?: Wisdom): string {
  return `${buildShareText(stats, wisdom)}\n\n${SITE_URL}`
}

export function telegramShareUrl(text: string): string {
  const params = new URLSearchParams({ url: SITE_URL, text })
  return `https://t.me/share/url?${params.toString()}`
}

export function vkShareUrl(text: string, title = 'pizdato'): string {
  const params = new URLSearchParams({
    url: SITE_URL,
    title,
    comment: text,
  })
  return `https://vk.com/share.php?${params.toString()}`
}

export function xShareUrl(text: string): string {
  const params = new URLSearchParams({
    url: SITE_URL,
    text,
  })
  return `https://x.com/intent/tweet?${params.toString()}`
}

export function vkShareUrlForChoice(text: string, choice?: Choice): string {
  const title =
    choice === 'pizdato'
      ? 'Я сделал пиздато'
      : choice === 'huyevo'
        ? 'Я сделал хуёво'
        : 'pizdato — выбери сторону'
  return vkShareUrl(text, title)
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
