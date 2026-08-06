import type { Stats } from './api'

const W = 640
const H = 160

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

/** Signature-friendly badge PNG (640×160). */
export async function renderBadgeCanvas(stats: Stats): Promise<HTMLCanvasElement> {
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

  // background
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#14201a')
  bg.addColorStop(1, '#0c1210')
  ctx.fillStyle = bg
  roundRect(ctx, 0, 0, W, H, 18)
  ctx.fill()

  // left accent bar
  ctx.fillStyle = accent
  ctx.fillRect(0, 0, 10, H)

  // soft glow
  const glow = ctx.createRadialGradient(
    choice === 'huyevo' ? W - 40 : 80,
    H / 2,
    10,
    choice === 'huyevo' ? W - 40 : 80,
    H / 2,
    140,
  )
  glow.addColorStop(0, choice === 'huyevo' ? 'rgba(255,77,61,0.22)' : 'rgba(61,255,154,0.2)')
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  // brand
  ctx.fillStyle = '#9aab9e'
  ctx.font = '600 18px Manrope, system-ui, sans-serif'
  ctx.fillText('PIZDATO.NET', 28, 36)

  // main label
  ctx.fillStyle = '#f2f5f0'
  ctx.font = '400 52px "Bebas Neue", Impact, sans-serif'
  ctx.fillText(label, 28, 92)

  // stats pills
  const pillY = 118
  drawPill(ctx, 28, pillY, `пиздато ${p}%`, '#06100b', accentDeep, '#3dff9a')
  const firstW = measurePillWidth(ctx, `пиздато ${p}%`)
  drawPill(
    ctx,
    28 + firstW + 10,
    pillY,
    `хуёво ${hPct}%`,
    '#1a0503',
    '#a31f14',
    '#ff4d3d',
  )

  // corner tag
  ctx.fillStyle = accent
  ctx.font = '700 16px Manrope, system-ui, sans-serif'
  const tag = choice === 'huyevo' ? 'хуёво' : 'пиздато'
  const tagW = ctx.measureText(tag).width
  ctx.fillText(tag, W - 28 - tagW, 36)

  return canvas
}

function measurePillWidth(ctx: CanvasRenderingContext2D, label: string): number {
  ctx.font = '800 16px Manrope, system-ui, sans-serif'
  return ctx.measureText(label).width + 24
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
  ctx.font = '800 16px Manrope, system-ui, sans-serif'
  const padX = 12
  const w = ctx.measureText(label).width + padX * 2
  const h = 28
  const grad = ctx.createLinearGradient(x, y, x + w, y)
  grad.addColorStop(0, from)
  grad.addColorStop(1, to)
  ctx.fillStyle = grad
  roundRect(ctx, x, y, w, h, 6)
  ctx.fill()
  ctx.fillStyle = textColor
  ctx.fillText(label, x + padX, y + 19)
}

export async function downloadBadge(stats: Stats): Promise<void> {
  const canvas = await renderBadgeCanvas(stats)
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
