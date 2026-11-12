import {
  collectTargets,
  type ImageBuffer,
  MAX_PARTICLES,
  type ParticleTone,
  type PointTarget,
  sampleStride,
  thinTargets,
} from '@/features/particle-name/simulation'

const MAX_EXTRA_STRIDE = 2

interface SpanSample {
  image: ImageBuffer
  baseStride: number
  offsetX: number
  offsetY: number
  tone: ParticleTone
}

function captureSpan(span: HTMLElement, headingRect: DOMRect): SpanSample | null {
  const rect = span.getBoundingClientRect()

  if (rect.width < 1 || rect.height < 1) {
    return null
  }

  const style = window.getComputedStyle(span)
  const fontSize = Number.parseFloat(style.fontSize) || 16
  const offscreen = document.createElement('canvas')
  offscreen.width = Math.max(1, Math.ceil(rect.width))
  offscreen.height = Math.max(1, Math.ceil(fontSize * 1.4))
  const offscreenContext = offscreen.getContext('2d', {
    willReadFrequently: true,
  })

  if (!offscreenContext) {
    return null
  }

  offscreenContext.font =
    `${style.fontStyle} ${style.fontWeight} ` + `${style.fontSize} ${style.fontFamily}`
  const spacedContext = offscreenContext as CanvasRenderingContext2D & {
    letterSpacing?: string
  }

  if ('letterSpacing' in spacedContext) {
    spacedContext.letterSpacing = style.letterSpacing
  }

  const text = span.textContent ?? ''
  const metrics = offscreenContext.measureText(text)
  const ascent = metrics.fontBoundingBoxAscent || fontSize * 0.8
  const descent = metrics.fontBoundingBoxDescent || fontSize * 0.2

  offscreenContext.textAlign = 'left'
  offscreenContext.textBaseline = 'alphabetic'
  offscreenContext.fillStyle = '#ffffff'
  offscreenContext.fillText(text, 0, (offscreen.height + ascent - descent) / 2)

  const image = offscreenContext.getImageData(0, 0, offscreen.width, offscreen.height)

  return {
    image,
    baseStride: sampleStride(fontSize),
    offsetX: rect.left - headingRect.left,
    offsetY: rect.top - headingRect.top - (offscreen.height - rect.height) / 2,
    tone: span.dataset.tone === 'muted' ? 'muted' : 'ink',
  }
}

function collectAt(spans: readonly SpanSample[], stride: number): PointTarget[] {
  const targets: PointTarget[] = []

  for (const span of spans) {
    const spanStride = Math.max(span.baseStride, stride)

    for (const point of collectTargets(span.image, spanStride, span.tone)) {
      targets.push({
        x: point.x + span.offsetX,
        y: point.y + span.offsetY,
        tone: span.tone,
      })
    }
  }

  return targets
}

export function sampleTextTargets(heading: HTMLElement, budget = MAX_PARTICLES): PointTarget[] {
  const headingRect = heading.getBoundingClientRect()
  const spans: SpanSample[] = []

  for (const span of heading.querySelectorAll<HTMLElement>('[data-particle-line]')) {
    const sample = captureSpan(span, headingRect)

    if (sample) {
      spans.push(sample)
    }
  }

  if (spans.length === 0) {
    return []
  }

  const lowestStride = spans.reduce(
    (lowest, span) => Math.min(lowest, span.baseStride),
    Number.POSITIVE_INFINITY,
  )

  // Widen the sampling grid before falling back to thinning: thinning keeps a
  // uniform *index* step, which perforates glyph strokes and makes the name
  // look noisy. A slightly coarser grid stays evenly spaced.
  let targets = collectAt(spans, lowestStride)

  for (let extra = 1; extra <= MAX_EXTRA_STRIDE && targets.length > budget; extra += 1) {
    targets = collectAt(spans, lowestStride + extra)
  }

  return thinTargets(targets, budget)
}
