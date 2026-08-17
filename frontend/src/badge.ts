import type { Stats } from './api'
import type { Wisdom } from './quotes'

const W = 720
const H = 280
const VW = 540
const VH = 960

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

/** Calculate pill width for a label, ensuring both pills are the same width. */
function calcPillWidth(ctx: CanvasRenderingContext2D, label1: string, label2: string): number {
  ctx.font = '800 15px Manrope, system-ui, sans-serif'
  const w1 = ctx.measureText(label1).width
  const w2 = ctx.measureText(label2).width
  return Math.max(w1, w2) + 22
}

/** Draw a pill-shaped badge. */
function drawPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  label: string,
  textColor: string,
  from: string,
  to: string,
) {
  const h = 26
  const padX = 11
  const grad = ctx.createLinearGradient(x, y, x + width, y)
  grad.addColorStop(0, from)
  grad.addColorStop(1, to)
  ctx.fillStyle = grad
  roundRect(ctx, x, y, width, h, 6)
  ctx.fill()
  ctx.fillStyle = textColor
  ctx.font = '800 15px Manrope, system-ui, sans-serif'
  ctx.fillText(label, x + padX, y + 18)
}

/** Draw pills at the bottom of a badge. */
function drawPills(
  ctx: CanvasRenderingContext2D,
  padX: number,
  pillY: number,
  p: number,
  hPct: number,
) {
  const pLabel = `пиздато ${p}%`
  const hLabel = `хуёво ${hPct}%`
  const pillW = calcPillWidth(ctx, pLabel, hLabel)

  // Green pill (пиздато) — always on the left
  drawPill(ctx, padX, pillY, pillW, pLabel, '#3dff9a', '#06100b', '#0f8f52')
  // Red pill (хуёво) — on the right
  drawPill(ctx, padX + pillW + 10, pillY, pillW, hLabel, '#ff4d3d', '#1a0503', '#a31f14')
}

/** Draw watermark at the bottom right. */
function drawWatermark(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#9aab9e'
  ctx.font = '500 11px Manrope, system-ui, sans-serif'
  const text = 'pizdato.net'
  const tw = ctx.measureText(text).width
  ctx.fillText(text, x - tw, y)
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
  const p = pct(stats.pizdato, stats.total)
  const hPct = pct(stats.huyevo, stats.total)
  const label =
    choice === 'pizdato'
      ? 'Я — ЗА ПИЗДАТО!'
      : choice === 'huyevo'
        ? 'Я — ЗА ХУЁВО!'
        : 'ВЫБЕРИ СТОРОНУ'

  const padX = 28
  const contentRight = W - padX
  const pillH = 26
  const pillY = H - 40 - pillH
  const titleBaseline = 102
  const middleTop = titleBaseline + 20
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
  ctx.fillText('МУДРОСТЬ ДНЯ', padX, 34)

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

  drawPills(ctx, padX, pillY, p, hPct)
  drawWatermark(ctx, contentRight, H - 14)

  return canvas
}

/** Vertical badge for stories (540×960). */
export async function renderVerticalBadgeCanvas(
  stats: Stats,
  wisdom?: Wisdom,
): Promise<HTMLCanvasElement> {
  await ensureFonts()

  const canvas = document.createElement('canvas')
  canvas.width = VW
  canvas.height = VH
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas unsupported')

  const choice = stats.choice
  const accent = choice === 'huyevo' ? '#ff4d3d' : '#3dff9a'
  const p = pct(stats.pizdato, stats.total)
  const hPct = pct(stats.huyevo, stats.total)
  const label =
    choice === 'pizdato'
      ? 'Я — ЗА ПИЗДАТО!'
      : choice === 'huyevo'
        ? 'Я — ЗА ХУЁВО!'
        : 'ВЫБЕРИ СТОРОНУ'

  const padX = 40
  const padTop = 60

  // Background
  const bg = ctx.createLinearGradient(0, 0, VW, VH)
  bg.addColorStop(0, '#14201a')
  bg.addColorStop(1, '#0c1210')
  ctx.fillStyle = bg
  roundRect(ctx, 0, 0, VW, VH, 24)
  ctx.fill()

  // Accent stripe (top)
  ctx.fillStyle = accent
  ctx.fillRect(0, 0, VW, 8)

  // Glow
  const glow = ctx.createRadialGradient(
    VW / 2, VH * 0.4, 10,
    VW / 2, VH * 0.4, 300,
  )
  glow.addColorStop(0, choice === 'huyevo' ? 'rgba(255,77,61,0.18)' : 'rgba(61,255,154,0.16)')
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, VW, VH)

  // Header
  ctx.fillStyle = '#9aab9e'
  ctx.font = '600 16px Manrope, system-ui, sans-serif'
  ctx.fillText('МУДРОСТЬ ДНЯ', padX, padTop + 20)

  // Tag
  ctx.fillStyle = accent
  ctx.font = '700 15px Manrope, system-ui, sans-serif'
  const tag = choice === 'huyevo' ? 'хуёво' : 'пиздато'
  ctx.fillText(tag, VW - padX - ctx.measureText(tag).width, padTop + 20)

  // Main label
  ctx.fillStyle = '#f2f5f0'
  ctx.font = '400 52px "Bebas Neue", Impact, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(label, VW / 2, VH * 0.35)
  ctx.textAlign = 'start'

  // Quote
  if (wisdom) {
    const quoteFont = '600 22px Manrope, system-ui, sans-serif'
    const authorFont = 'italic 600 16px Manrope, system-ui, sans-serif'
    const lineHeight = 32
    const authorGap = 16
    const maxWidth = VW - padX * 2

    ctx.font = quoteFont
    const lines = wrapText(ctx, wisdom.text, maxWidth, 4)
    ctx.font = authorFont
    const author = `— ${wisdom.author}`

    const quoteY = VH * 0.52

    ctx.fillStyle = '#d7e0d8'
    ctx.font = quoteFont
    let y = quoteY
    for (const line of lines) {
      ctx.textAlign = 'center'
      ctx.fillText(line, VW / 2, y)
      ctx.textAlign = 'start'
      y += lineHeight
    }

    ctx.fillStyle = '#9aab9e'
    ctx.font = authorFont
    ctx.textAlign = 'center'
    ctx.fillText(author, VW / 2, y + authorGap)
    ctx.textAlign = 'start'
  }

  // Pills
  const pillY = VH - 120
  drawPills(ctx, padX, pillY, p, hPct)

  // Watermark
  ctx.textAlign = 'center'
  drawWatermark(ctx, VW - padX, VH - 30)
  ctx.textAlign = 'start'

  return canvas
}

/** Download the horizontal badge as PNG. */
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

  // Track download
  navigator.sendBeacon('/api/event?type=badge_download')
}

/** Download the vertical badge as PNG. */
export async function downloadVerticalBadge(stats: Stats, wisdom?: Wisdom): Promise<void> {
  const canvas = await renderVerticalBadgeCanvas(stats, wisdom)
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png'),
  )
  if (!blob) throw new Error('failed to create vertical badge')

  const choice = stats.choice ?? 'vote'
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pizdato-${choice}-stories.png`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)

  // Track download
  navigator.sendBeacon('/api/event?type=badge_share_stories')
}