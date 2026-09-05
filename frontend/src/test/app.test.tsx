import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'

// Mock heavy side-effect imports
vi.mock('canvas-confetti', () => ({
  default: vi.fn(() => Promise.resolve()),
}))

vi.mock('../metrika', () => ({
  reachGoal: vi.fn(),
  GOAL_VOTE_SUCCESS: 'vote_success',
}))

vi.mock('../quotes', () => ({
  pickQuotes: vi.fn(() => [
    { text: 'Test wisdom.', author: 'Sage' },
  ]),
}))

// Mock fetch for stats calls
const mockStats = { pizdato: 100, huyevo: 50, total: 150, voted: false }

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(mockStats),
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('renders the site navigation', () => {
    render(<App />)
    expect(screen.getByLabelText('pizdato — на главную')).toBeInTheDocument()
  })

  it('renders the hero section', () => {
    render(<App />)
    expect(screen.getByTestId('hero')).toBeInTheDocument()
  })

  it('renders the hero heading', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'pizdato' })).toBeInTheDocument()
  })

  it('renders vote buttons', () => {
    render(<App />)
    expect(screen.getByTestId('btn-primary')).toBeInTheDocument()
    expect(screen.getByTestId('btn-secondary')).toBeInTheDocument()
  })

  it('disables vote buttons while loading', () => {
    render(<App />)
    const primary = screen.getByTestId('btn-primary')
    expect(primary).toBeDisabled()
  })

  it('renders the footer', () => {
    render(<App />)
    expect(screen.getByText(/Telegram-канал пиздато/)).toBeInTheDocument()
  })
})