import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import {
  buildShareText,
  buildQuoteShareText,
  buildQuoteCopyText,
  buildShareCopyText,
  telegramShareUrl,
  vkShareUrl,
  vkShareUrlForChoice,
  copyShareText,
  nativeShare,
} from '../share'
import type { Stats } from '../api'

const BASE_STATS: Stats = { pizdato: 60, huyevo: 40, total: 100, voted: false }
const WISDOM = { text: 'Test wisdom.', author: 'Sage' }

describe('buildShareText', () => {
  it('returns neutral text when not voted', () => {
    const text = buildShareText(BASE_STATS)
    expect(text).toContain('Мир делится на пиздато и хуёво')
    expect(text).toContain('60%')
    expect(text).toContain('40%')
    expect(text).toContain('100')
  })

  it('returns pizdato text when voted pizdato', () => {
    const stats: Stats = { ...BASE_STATS, voted: true, choice: 'pizdato' }
    const text = buildShareText(stats)
    expect(text).toContain('Я сделал пиздато')
    expect(text).toContain('60%')
  })

  it('returns huyevo text when voted huyevo', () => {
    const stats: Stats = { ...BASE_STATS, voted: true, choice: 'huyevo' }
    const text = buildShareText(stats)
    expect(text).toContain('Я сознательно сделал хуёво')
  })

  it('includes wisdom quote when provided', () => {
    const text = buildShareText(BASE_STATS, WISDOM)
    expect(text).toContain('Test wisdom.')
    expect(text).toContain('Sage')
  })

  it('handles zero total without error', () => {
    const zero: Stats = { pizdato: 0, huyevo: 0, total: 0, voted: false }
    const text = buildShareText(zero)
    expect(text).toContain('0%')
  })
})

describe('telegramShareUrl', () => {
  it('builds a valid telegram share URL', () => {
    const url = telegramShareUrl('hello')
    expect(url).toMatch(/^https:\/\/t\.me\/share\/url\?/)
    expect(url).toContain(encodeURIComponent('hello'))
    expect(url).toContain(encodeURIComponent('https://pizdato.net/'))
  })
})

describe('vkShareUrl', () => {
  it('builds a valid VK share URL with comment and title', () => {
    const url = vkShareUrl('test text', 'test title')
    expect(url).toMatch(/^https:\/\/vk\.com\/share\.php\?/)
    // URLSearchParams uses + for spaces, encodeURIComponent uses %20
    expect(url).toContain('comment=test+text')
    expect(url).toContain('title=test+title')
  })
})

describe('vkShareUrlForChoice', () => {
  it('uses pizdato title when choice is pizdato', () => {
    const url = vkShareUrlForChoice('text', 'pizdato')
    expect(url).toContain('title=')
    expect(url).toContain(encodeURIComponent('пиздато'))
  })

  it('uses huyevo title when choice is huyevo', () => {
    const url = vkShareUrlForChoice('text', 'huyevo')
    expect(url).toContain('title=')
    expect(url).toContain(encodeURIComponent('хуёво'))
  })

  it('uses default title when no choice', () => {
    const url = vkShareUrlForChoice('text')
    expect(url).toContain('title=')
    expect(url).toContain(encodeURIComponent('сторону'))
  })
})

describe('buildQuoteShareText', () => {
  it('formats quote text with wisdom', () => {
    const text = buildQuoteShareText(WISDOM)
    expect(text).toContain('Мудрость дня')
    expect(text).toContain('Test wisdom.')
    expect(text).toContain('Sage')
  })
})

describe('buildQuoteCopyText', () => {
  it('includes site URL at the end', () => {
    const text = buildQuoteCopyText(WISDOM)
    expect(text).toContain('https://pizdato.net/')
  })
})

describe('buildShareCopyText', () => {
  it('combines share text with URL', () => {
    const text = buildShareCopyText(BASE_STATS)
    expect(text).toContain('\n\nhttps://pizdato.net/')
  })
})

describe('copyShareText', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  it('copies text to clipboard via API', async () => {
    await copyShareText('test text')
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test text')
  })

  it('falls back to textarea method when clipboard API is missing', async () => {
    delete (navigator as any).clipboard
    const appendChild = vi.fn()
    const removeChild = vi.fn()
    document.body.appendChild = appendChild
    document.body.removeChild = removeChild
    // jsdom doesn't implement execCommand — mock it
    document.execCommand = vi.fn() as any

    await copyShareText('fallback test')
    expect(appendChild).toHaveBeenCalled()
    expect(removeChild).toHaveBeenCalled()
  })
})

describe('nativeShare', () => {
  beforeEach(() => {
    ;(navigator as any).share = undefined
  })

  it('returns false when navigator.share not available', async () => {
    const result = await nativeShare('text')
    expect(result).toBe(false)
  })

  it('returns true on successful share', async () => {
    ;(navigator as any).share = vi.fn().mockResolvedValue(undefined)
    const result = await nativeShare('text')
    expect(result).toBe(true)
  })

  it('returns false on share rejection', async () => {
    ;(navigator as any).share = vi.fn().mockRejectedValue(new Error('Abort'))
    const result = await nativeShare('text')
    expect(result).toBe(false)
  })
})