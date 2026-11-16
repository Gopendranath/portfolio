import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { type VirtualSection, VirtualSectionList } from '@/components/ui/virtual-section-list'
import { scrollWindowInstant } from '@/lib/dom/scroll-to-instant'

const sections: VirtualSection[] = Array.from({ length: 6 }, (_, index) => ({
  id: `section-${index}`,
  estimate: 600,
  content: <p>section {index + 1}</p>,
}))

class StubResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const originalResizeObserver = globalThis.ResizeObserver

const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')
const originalOffsetTop = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetTop')

function stubLayout(listTop: () => number) {
  // TanStack Virtual measures items with `offsetHeight`, not client rects.
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get: () => 600,
  })

  // The list's document offset comes from the layout offset chain (`offsetTop`).
  Object.defineProperty(HTMLElement.prototype, 'offsetTop', {
    configurable: true,
    get(this: HTMLElement) {
      return this.dataset.scrollMargin === undefined ? 0 : listTop()
    },
  })
}

beforeEach(() => {
  // jsdom does not implement scrolling; the virtualizer writes scroll offsets.
  vi.stubGlobal('scrollTo', () => {})
})

afterEach(() => {
  globalThis.ResizeObserver = originalResizeObserver

  if (originalOffsetHeight) {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight)
  }

  if (originalOffsetTop) {
    Object.defineProperty(HTMLElement.prototype, 'offsetTop', originalOffsetTop)
  }

  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('renders every section in flow when ResizeObserver is unavailable', () => {
  // @ts-expect-error test-only removal of a browser global
  delete globalThis.ResizeObserver

  const { container } = render(<VirtualSectionList sections={sections} />)

  expect(screen.getAllByText(/^section \d$/)).toHaveLength(sections.length)
  expect(container.querySelectorAll('[data-index]')).toHaveLength(0)
})

it('mounts only the sections near the viewport when measurement is available', () => {
  globalThis.ResizeObserver = StubResizeObserver as unknown as typeof ResizeObserver
  stubLayout(() => 0)

  render(<VirtualSectionList sections={sections} />)

  expect(screen.getByText('section 1')).toBeInTheDocument()
  expect(screen.queryByText('section 6')).not.toBeInTheDocument()
})

it('re-measures the scroll margin when the page above the list resizes', () => {
  globalThis.ResizeObserver = StubResizeObserver as unknown as typeof ResizeObserver
  let listTop = 200
  stubLayout(() => listTop)

  render(<VirtualSectionList sections={sections} />)

  const list = document.querySelector('[data-scroll-margin]')
  expect(list).toHaveAttribute('data-scroll-margin', '200')

  listTop = 400
  fireEvent(window, new Event('resize'))

  expect(list).toHaveAttribute('data-scroll-margin', '400')
})

it('renders every section while printing', () => {
  globalThis.ResizeObserver = StubResizeObserver as unknown as typeof ResizeObserver
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === 'print',
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  }))

  render(<VirtualSectionList sections={sections} />)

  expect(screen.getAllByText(/^section \d$/)).toHaveLength(sections.length)
})

it('unmounts sections that sit far outside the viewport', () => {
  globalThis.ResizeObserver = StubResizeObserver as unknown as typeof ResizeObserver
  stubLayout(() => 0)

  const many: VirtualSection[] = Array.from({ length: 8 }, (_, index) => ({
    id: `many-${index}`,
    estimate: 600,
    content: <p>row {index + 1}</p>,
  }))

  render(<VirtualSectionList sections={many} />)

  const mounted = screen.getAllByText(/^row \d$/).length
  expect(mounted).toBeLessThan(many.length)
  expect(screen.getByText('row 1')).toBeInTheDocument()
  expect(screen.queryByText('row 8')).not.toBeInTheDocument()
})

it('includes the offset parent border in the scroll margin', () => {
  globalThis.ResizeObserver = StubResizeObserver as unknown as typeof ResizeObserver
  stubLayout(() => 200)

  const fakeParent = { clientTop: 12, offsetTop: 0, offsetParent: null }
  const originalOffsetParent = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'offsetParent',
  )

  Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
    configurable: true,
    get(this: HTMLElement) {
      return this.dataset.scrollMargin === undefined ? null : fakeParent
    },
  })

  render(<VirtualSectionList sections={sections} />)

  expect(document.querySelector('[data-scroll-margin]')).toHaveAttribute(
    'data-scroll-margin',
    '212',
  )

  if (originalOffsetParent) {
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', originalOffsetParent)
  }
})

it('corrects scroll offsets without animating them', () => {
  const scrollTo = vi.fn()
  vi.stubGlobal('scrollTo', scrollTo)

  scrollWindowInstant(480, {})

  expect(scrollTo).toHaveBeenCalledWith({ top: 480, behavior: 'instant' })
})
