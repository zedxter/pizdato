import type { Stats } from './api'
import type { Wisdom } from './quotes'

const W = 720
const H = 280

function pct(part: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((part / total) * 100)
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

async function ensureFonts(): Promise<void> {
  if (!('fonts' in document)) return
  try {
    await Promise.race([
      document.fonts.ready,
      new Promise((r) => setTimeout(r, 800)),
    ])
  } catch {
    /* ignore */
  }
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (ctx.measureText(next).width <= maxWidth) {
      current = next
      continue
    }
    if (current) lines.push(current)
    current = word
    if (lines.length >= maxLines) break
  }

  if (lines.length < maxLines && current) {
    lines.push(current)
  }

  const fitted = lines.slice(0, maxLines)
  const consumed = fitted.join(' ')
  if (consumed.length < text.trim().length && fitted.length > 0) {
    let last = fitted[fitted.length - 1]
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1).trimEnd()
    }
    fitted[fitted.length - 1] = `${last}…`
  }

  return fitted
}

/** Signature badge with choice + wisdom quote (720×280). */
export async function renderBadgeCanvas(
  stats: Stats,
  wisdom?: Wisdom,
): Promise<HTMLCanvasElement> {
  await ensureFonts()

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas unsupported')

  const choice = stats.choice
  const accent = choice === 'huyevo' ? '#ff4d3d' : '#3dff9a'
  const accentDeep = choice === 'huyevo' ? '#a31f14' : '#0f8f52'
  const p = pct(stats.pizdato, stats.total)
  const hPct = pct(stats.huyevo, stats.total)
  const label =
    choice === 'pizdato'
      ? 'Я ЗА ПИЗДАТО'
      : choice === 'huyevo'
        ? 'Я ЗА ХУЁВО'
        : 'ВЫБЕРИ СТОРОНУ'

  const padX = 28
  const contentRight = W - padX
  const pillH = 26
  const pillY = H - 36 - pillH
  const titleBaseline = 88
  const middleTop = titleBaseline + 22
  const middleBottom = pillY - 16

  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#14201a')
  bg.addColorStop(1, '#0c1210')
  ctx.fillStyle = bg
  roundRect(ctx, 0, 0, W, H, 18)
  ctx.fill()

  ctx.fillStyle = accent
  ctx.fillRect(0, 0, 10, H)

  const glow = ctx.createRadialGradient(
    choice === 'huyevo' ? W - 60 : 100,
    H * 0.45,
    10,
    choice === 'huyevo' ? W - 60 : 100,
    H * 0.45,
    200,
  )
  glow.addColorStop(0, choice === 'huyevo' ? 'rgba(255,77,61,0.18)' : 'rgba(61,255,154,0.16)')
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = '#9aab9e'
  ctx.font = '600 15px Manrope, system-ui, sans-serif'
  ctx.fillText('PIZDATO.NET · МУДРОСТЬ ДНЯ', padX, 34)

  ctx.fillStyle = accent
  ctx.font = '700 14px Manrope, system-ui, sans-serif'
  const tag = choice === 'huyevo' ? 'хуёво' : 'пиздато'
  const tagW = ctx.measureText(tag).width
  ctx.fillText(tag, contentRight - tagW, 34)

  ctx.fillStyle = '#f2f5f0'
  ctx.font = '400 42px "Bebas Neue", Impact, sans-serif'
  ctx.fillText(label, padX, titleBaseline)

  if (wisdom) {
    const quoteFont = '600 19px Manrope, system-ui, sans-serif'
    const authorFont = 'italic 600 15px Manrope, system-ui, sans-serif'
    const lineHeight = 28
    const authorGap = 14

    ctx.font = quoteFont
    const lines = wrapText(ctx, wisdom.text, contentRight - padX, 3)
    ctx.font = authorFont
    const author = `— ${wisdom.author}`

    const quoteBlockH = lines.length * lineHeight + authorGap + 15
    const available = Math.max(quoteBlockH, middleBottom - middleTop)
    let y = middleTop + (available - quoteBlockH) / 2 + lineHeight * 0.75

    ctx.fillStyle = '#d7e0d8'
    ctx.font = quoteFont
    for (const line of lines) {
      ctx.fillText(line, padX, y)
      y += lineHeight
    }

    ctx.fillStyle = '#9aab9e'
    ctx.font = authorFont
    const aw = ctx.measureText(author).width
    ctx.fillText(author, contentRight - aw, y + authorGap)
  }

  drawPill(ctx, padX, pillY, `пиздато ${p}%`, '#06100b', accentDeep, '#3dff9a')
  const firstW = measurePillWidth(ctx, `пиздато ${p}%`)
  drawPill(
    ctx,
    padX + firstW + 10,
    pillY,
    `хуёво ${hPct}%`,
    '#1a0503',
    '#a31f14',
    '#ff4d3d',
  )

  return canvas
}

function measurePillWidth(ctx: CanvasRenderingContext2D, label: string): number {
  ctx.font = '800 15px Manrope, system-ui, sans-serif'
  return ctx.measureText(label).width + 22
}

function drawPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  textColor: string,
  from: string,
  to: string,
) {
  ctx.font = '800 15px Manrope, system-ui, sans-serif'
  const padX = 11
  const w = ctx.measureText(label).width + padX * 2
  const h = 26
  const grad = ctx.createLinearGradient(x, y, x + w, y)
  grad.addColorStop(0, from)
  grad.addColorStop(1, to)
  ctx.fillStyle = grad
  roundRect(ctx, x, y, w, h, 6)
  ctx.fill()
  ctx.fillStyle = textColor
  ctx.fillText(label, x + padX, y + 18)
}

export async function downloadBadge(stats: Stats, wisdom?: Wisdom): Promise<void> {
  const canvas = await renderBadgeCanvas(stats, wisdom)
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png'),
  )
  if (!blob) throw new Error('failed to create badge')

  const choice = stats.choice ?? 'vote'
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pizdato-${choice}-badge.png`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
