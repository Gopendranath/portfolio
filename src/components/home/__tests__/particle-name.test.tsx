import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ParticleName } from '../particle-name'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('ParticleName', () => {
  it('keeps the full name as the heading accessible name', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)

    render(
      <ParticleName
        lines={[{ text: 'Gopendranath' }, { text: 'Sasmal', muted: true }]}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'Gopendranath Sasmal' }),
    ).toBeInTheDocument()
  })

  it('renders plain text and no canvas when Canvas 2D is unavailable', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)

    const { container } = render(
      <ParticleName
        lines={[{ text: 'Gopendranath' }, { text: 'Sasmal', muted: true }]}
      />,
    )

    expect(container.querySelector('canvas')).toBeNull()
    expect(container.querySelector('span')).not.toHaveClass('text-transparent')
  })

  it('stays visible until fonts are ready and the first frame has painted', async () => {
    const { drawImage, resolveFonts } = stubParticleEnvironment()
    const { container } = render(
      <ParticleName
        lines={[{ text: 'Gopendranath' }, { text: 'Sasmal', muted: true }]}
      />,
    )
    const spans = [...container.querySelectorAll('span')]

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    expect(
      spans.every((span) => !span.className.includes('text-transparent')),
    ).toBe(true)
    expect(drawImage).not.toHaveBeenCalled()

    await act(async () => {
      resolveFonts()
      await new Promise((resolve) => setTimeout(resolve, 80))
    })

    expect(drawImage).toHaveBeenCalled()
    expect(spans[0]).toHaveClass('text-transparent')
  })

  it('paints a static frame and stops scheduling under reduced motion', async () => {
    const { drawImage, rafCount, resolveFonts } = stubParticleEnvironment({
      reducedMotion: true,
    })
    const { container } = render(
      <ParticleName
        lines={[{ text: 'Gopendranath' }, { text: 'Sasmal', muted: true }]}
      />,
    )

    await act(async () => {
      resolveFonts()
      await new Promise((resolve) => setTimeout(resolve, 80))
    })

    expect(drawImage).toHaveBeenCalled()
    expect(container.querySelector('span')).toHaveClass('text-transparent')

    const frames = rafCount()
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })
    expect(rafCount()).toBe(frames)
  })
})

function stubParticleEnvironment({
  reducedMotion = false,
}: {
  reducedMotion?: boolean
} = {}) {
  const context = {
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    stroke: vi.fn(),
    getImageData: vi.fn(
      (_x: number, _y: number, width: number, height: number) => ({
        data: new Uint8ClampedArray(width * height * 4).fill(255),
        width,
        height,
      }),
    ),
    measureText: vi.fn(() => ({
      fontBoundingBoxAscent: 10,
      fontBoundingBoxDescent: 2,
    })),
    setTransform: vi.fn(),
  }

  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  )
  vi.spyOn(
    HTMLHeadingElement.prototype,
    'getBoundingClientRect',
  ).mockReturnValue(rect(200, 90))
  vi.spyOn(HTMLSpanElement.prototype, 'getBoundingClientRect').mockReturnValue(
    rect(200, 45),
  )

  let resolveFonts = () => {}
  const ready = new Promise<void>((resolve) => {
    resolveFonts = resolve
  })

  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: { ready },
  })

  class ResizeObserverStub {
    constructor(callback: () => void) {
      callback()
    }

    observe() {}
    unobserve() {}
    disconnect() {}
  }

  class IntersectionObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  vi.stubGlobal('ResizeObserver', ResizeObserverStub)
  vi.stubGlobal('IntersectionObserver', IntersectionObserverStub)
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: reducedMotion,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )

  let frames = 0
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames += 1
    return setTimeout(() => callback(performance.now()), 16)
  })
  vi.stubGlobal('cancelAnimationFrame', (handle: number) =>
    clearTimeout(handle),
  )

  return {
    context,
    drawImage: context.drawImage,
    rafCount: () => frames,
    resolveFonts,
  }
}

function rect(width: number, height: number): DOMRect {
  return {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    width,
    height,
    toJSON: () => ({}),
  }
}
