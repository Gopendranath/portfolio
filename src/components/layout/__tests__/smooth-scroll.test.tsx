import { render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { SmoothScroll } from '@/components/layout/smooth-scroll'
import { scrollWindowInstant } from '@/lib/dom/scroll-to-instant'

const harness = vi.hoisted(() => ({
  instances: [] as Array<{
    options: Record<string, unknown>
    scrollTo: ReturnType<typeof vi.fn>
    resize: ReturnType<typeof vi.fn>
    destroy: ReturnType<typeof vi.fn>
  }>,
  pathname: '/about',
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
  useRouterState: ({ select }: { select: (state: unknown) => unknown }) =>
    select({ location: { pathname: harness.pathname } }),
}))

afterEach(() => {
  harness.instances.length = 0
  harness.pathname = '/about'
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

  expect(lenis?.destroy).toHaveBeenCalled()

  scrollWindowInstant(700, {})

  expect(scrollTo).toHaveBeenCalledWith({ top: 700, behavior: 'instant' })
})

it('resizes lenis when the route changes', () => {
  const { rerender } = render(<SmoothScroll />)
  const lenis = harness.instances[0]

  harness.pathname = '/projects'
  rerender(<SmoothScroll />)

  expect(lenis?.resize).toHaveBeenCalled()
})
