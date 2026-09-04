import { describe, it, expect, vi, beforeAll } from 'vitest'
import { renderBadgeCanvas } from '../badge'
import type { Stats } from '../api'

const BASE_STATS: Stats = { pizdato: 60, huyevo: 40, total: 100, voted: false }
const WISDOM = { text: 'Test wisdom.', author: 'Sage' }

beforeAll(() => {
  const gradient = { addColorStop: vi.fn() }

  class MockCanvasRenderingContext2D {
    fillStyle: string | CanvasGradient | CanvasPattern = ''
    font = ''
    textAlign: CanvasTextAlign = 'start'
    beginPath = vi.fn()
    moveTo = vi.fn()
    arcTo = vi.fn()
    closePath = vi.fn()
    fill = vi.fn()
    fillRect = vi.fn()
    fillText = vi.fn()
    measureText = vi.fn(() => ({ width: 80 }))
    createLinearGradient = vi.fn(() => gradient)
    createRadialGradient = vi.fn(() => gradient)
  }

  vi.stubGlobal('CanvasRenderingContext2D', MockCanvasRenderingContext2D)

  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    ((type: string) => {
      if (type === '2d') {
        return new MockCanvasRenderingContext2D() as unknown as CanvasRenderingContext2D
      }
      return null
    }) as typeof HTMLCanvasElement.prototype.getContext,
  )
})

describe('renderBadgeCanvas', () => {
  it('returns an HTMLCanvasElement for sample stats', async () => {
    const canvas = await renderBadgeCanvas(BASE_STATS)
    expect(canvas).toBeInstanceOf(HTMLCanvasElement)
  })

  it('returns an HTMLCanvasElement when wisdom is provided', async () => {
    const canvas = await renderBadgeCanvas(BASE_STATS, WISDOM)
    expect(canvas).toBeInstanceOf(HTMLCanvasElement)
  })

  it("works for the 'pizdato' choice", async () => {
    const stats: Stats = { ...BASE_STATS, voted: true, choice: 'pizdato' }
    const canvas = await renderBadgeCanvas(stats, WISDOM)
    expect(canvas).toBeInstanceOf(HTMLCanvasElement)
  })

  it("works for the 'huyevo' choice", async () => {
    const stats: Stats = { ...BASE_STATS, voted: true, choice: 'huyevo' }
    const canvas = await renderBadgeCanvas(stats, WISDOM)
    expect(canvas).toBeInstanceOf(HTMLCanvasElement)
  })
})
