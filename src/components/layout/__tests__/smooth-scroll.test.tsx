import { render } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { SmoothScroll } from '@/components/layout/smooth-scroll'
import { scrollWindowInstant } from '@/lib/dom/scroll-to-instant'

const harness = vi.hoisted(() => ({
  instances: [] as Array<{
    options: Record<string, unknown>
    scrollTo: ReturnType<typeof vi.fn>
    resize: ReturnType<typeof vi.fn>
    destroy: ReturnType<typeof vi.fn>
  }>,
  listeners: [] as Array<() => void>,
  unsubscribed: 0,
}))

vi.mock('lenis', () => ({
  default: class MockLenis {
    options: Record<string, unknown>
    scrollTo = vi.fn()
    resize = vi.fn()
    destroy = vi.fn()

    constructor(options: Record<string, unknown>) {
      this.options = options
      harness.instances.push(this)
    }
  },
}))

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({
    subscribe: (_event: string, listener: () => void) => {
      harness.listeners.push(listener)

      return () => {
        harness.unsubscribed += 1
      }
    },
  }),
}))

beforeEach(() => {
  harness.instances.length = 0
  harness.listeners.length = 0
  harness.unsubscribed = 0
})

afterEach(() => {
  vi.unstubAllGlobals()
})

it('creates one lenis instance with the site options and no anchor interception', () => {
  render(<SmoothScroll />)

  expect(harness.instances).toHaveLength(1)
  expect(harness.instances[0]?.options).toEqual({
    autoRaf: true,
    duration: 1.1,
    stopInertiaOnNavigate: true,
    syncTouch: false,
  })
  expect(harness.instances[0]?.options.anchors).toBeUndefined()
})

it('routes instant corrections through lenis and restores the fallback on unmount', () => {
  const scrollTo = vi.fn()
  vi.stubGlobal('scrollTo', scrollTo)

  const { unmount } = render(<SmoothScroll />)
  const lenis = harness.instances[0]

  scrollWindowInstant(640, {})

  expect(lenis?.scrollTo).toHaveBeenCalledWith(640, { immediate: true, force: true })
  expect(scrollTo).not.toHaveBeenCalled()

  unmount()

  expect(harness.instances).toHaveLength(1)
  expect(lenis?.destroy).toHaveBeenCalled()
  expect(harness.unsubscribed).toBe(1)

  scrollWindowInstant(700, {})

  expect(scrollTo).toHaveBeenCalledWith({ top: 700, behavior: 'instant' })
})

it('resizes lenis when navigation resolves', () => {
  render(<SmoothScroll />)
  const lenis = harness.instances[0]

  for (const listener of harness.listeners) {
    listener()
  }

  expect(lenis?.resize).toHaveBeenCalled()
})
