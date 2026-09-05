import '@testing-library/jest-dom'
import { vi } from 'vitest'

// JSDom doesn't implement ResizeObserver; SiteNav.tsx uses it in useLayoutEffect
class ResizeObserverMock {
  constructor(callback: ResizeObserverCallback) {
    // no-op
  }
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver