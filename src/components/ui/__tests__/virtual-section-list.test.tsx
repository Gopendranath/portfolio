import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { type VirtualSection, VirtualSectionList } from '@/components/ui/virtual-section-list'

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

function stubRects(top: () => number) {
  // TanStack Virtual measures items with `offsetHeight`, not client rects.
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get: () => 600,
  })

  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const isList = this.dataset.scrollMargin !== undefined
    const offset = isList ? top() : 0
    return {
      x: 0,
      y: offset,
      top: offset,
      left: 0,
      right: 800,
      bottom: offset + 600,
      width: 800,
      height: 600,
      toJSON: () => ({}),
    } as DOMRect
  })
}

afterEach(() => {
  globalThis.ResizeObserver = originalResizeObserver

  if (originalOffsetHeight) {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight)
  }

  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

beforeEach(() => {
  // jsdom does not implement scrolling; the virtualizer writes scroll offsets.
  vi.stubGlobal('scrollTo', () => {})
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
  stubRects(() => 0)

  render(<VirtualSectionList sections={sections} />)

  expect(screen.getByText('section 1')).toBeInTheDocument()
  expect(screen.queryByText('section 6')).not.toBeInTheDocument()
})

it('re-measures the scroll margin when the page above the list resizes', () => {
  globalThis.ResizeObserver = StubResizeObserver as unknown as typeof ResizeObserver
  let listTop = 200
  stubRects(() => listTop)

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
