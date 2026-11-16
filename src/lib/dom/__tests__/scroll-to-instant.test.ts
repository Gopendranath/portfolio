import { afterEach, expect, it, vi } from 'vitest'
import { scrollWindowInstant, setImmediateScroller } from '@/lib/dom/scroll-to-instant'

afterEach(() => {
  setImmediateScroller(null)
  vi.unstubAllGlobals()
})

it('falls back to a window scroll when no smooth scroller is registered', () => {
  const scrollTo = vi.fn()
  vi.stubGlobal('scrollTo', scrollTo)

  scrollWindowInstant(480, {})

  expect(scrollTo).toHaveBeenCalledWith({ top: 480, behavior: 'instant' })
})

it('routes corrections through the registered scroller', () => {
  const scrollTo = vi.fn()
  const immediate = vi.fn()
  vi.stubGlobal('scrollTo', scrollTo)
  setImmediateScroller(immediate)

  scrollWindowInstant(900, {})

  expect(immediate).toHaveBeenCalledWith(900)
  expect(scrollTo).not.toHaveBeenCalled()
})

it('leaves smooth requests to the window', () => {
  const scrollTo = vi.fn()
  const immediate = vi.fn()
  vi.stubGlobal('scrollTo', scrollTo)
  setImmediateScroller(immediate)

  scrollWindowInstant(300, { behavior: 'smooth' })

  expect(immediate).not.toHaveBeenCalled()
  expect(scrollTo).toHaveBeenCalledWith({ top: 300, behavior: 'smooth' })
})

it('adds the virtualizer adjustment to the written offset', () => {
  const scrollTo = vi.fn()
  const immediate = vi.fn()
  vi.stubGlobal('scrollTo', scrollTo)

  scrollWindowInstant(400, { adjustments: 120 })

  expect(scrollTo).toHaveBeenCalledWith({ top: 520, behavior: 'instant' })

  setImmediateScroller(immediate)
  scrollWindowInstant(400, { adjustments: -40 })

  expect(immediate).toHaveBeenCalledWith(360)
})
