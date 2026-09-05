import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SharePanel } from '../SharePanel'
import type { Stats } from '../api'

const BASE_STATS: Stats = {
  pizdato: 60,
  huyevo: 40,
  total: 100,
  voted: true,
  choice: 'pizdato',
}

const WISDOM = { text: 'Test wisdom.', author: 'Sage' }

// Mock badge render to avoid canvas dependency
vi.mock('../badge', () => ({
  renderBadgeCanvas: vi.fn().mockResolvedValue({
    toBlob: (cb: (b: Blob | null) => void) => {
      cb(new Blob(['fake-png'], { type: 'image/png' }))
    },
  }),
  downloadBadge: vi.fn(),
  downloadVerticalBadge: vi.fn(),
}))

// Mock ShareIcons (they are SVGs, no actual logic to test here)
vi.mock('../ShareIcons', () => ({
  IconCheck: () => <span data-testid="icon-check">✓</span>,
  IconCopy: () => <span data-testid="icon-copy">📋</span>,
  IconDownload: () => <span data-testid="icon-download">⬇</span>,
  IconMore: () => <span data-testid="icon-more">⋯</span>,
  IconTelegram: () => <span data-testid="icon-tg">✈</span>,
  IconVk: () => <span data-testid="icon-vk">V</span>,
  IconX: () => <span data-testid="icon-x">X</span>,
}))

// Mock URL.createObjectURL
beforeEach(() => {
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:fake-url'),
    revokeObjectURL: vi.fn(),
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('SharePanel', () => {
  it('renders the share heading', () => {
    render(<SharePanel stats={BASE_STATS} wisdom={WISDOM} />)
    expect(screen.getByText('Кинь другу результат — пусть тоже выберет')).toBeInTheDocument()
  })

  it('displays the user verdict', () => {
    render(<SharePanel stats={BASE_STATS} wisdom={WISDOM} />)
    expect(screen.getByText(/Твой вердикт: пиздато/)).toBeInTheDocument()
  })

  it('shows vote percentages', () => {
    render(<SharePanel stats={BASE_STATS} wisdom={WISDOM} />)
    expect(screen.getByText(/60% пиздато/)).toBeInTheDocument()
    expect(screen.getByText(/40% хуёво/)).toBeInTheDocument()
  })

  it('renders share action buttons', () => {
    render(<SharePanel stats={BASE_STATS} wisdom={WISDOM} />)
    const group = screen.getByRole('group', { name: 'Поделиться результатом' })
    expect(group).toBeInTheDocument()
  })

  it('renders a badge preview image (async)', async () => {
    render(<SharePanel stats={BASE_STATS} wisdom={WISDOM} />)
    const img = await screen.findByAltText('Бейдж результата pizdato', {}, { timeout: 2000 })
    expect(img).toBeInTheDocument()
  })

  it('renders social share links (Telegram, VK, X)', () => {
    render(<SharePanel stats={BASE_STATS} wisdom={WISDOM} />)
    expect(screen.getByLabelText('Поделиться результатом в Telegram')).toBeInTheDocument()
    expect(screen.getByLabelText('Поделиться результатом во ВКонтакте')).toBeInTheDocument()
    expect(screen.getByLabelText('Поделиться результатом в X (Twitter)')).toBeInTheDocument()
  })

  it('renders channel subscription link', () => {
    render(<SharePanel stats={BASE_STATS} wisdom={WISDOM} />)
    expect(screen.getByText('Подписаться на @pizdato_net')).toBeInTheDocument()
  })

  it('renders sticker pack link', () => {
    render(<SharePanel stats={BASE_STATS} wisdom={WISDOM} />)
    expect(screen.getByText(/Стикеры дяди Миши/)).toBeInTheDocument()
  })
})