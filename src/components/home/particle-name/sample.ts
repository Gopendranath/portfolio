import {
  type ParticleTone,
  type PointTarget,
  MAX_POINTS,
  collectTargets,
  sampleStride,
  thinTargets,
} from '../../../lib/particle-name'

export function sampleTextTargets(heading: HTMLElement): PointTarget[] {
  const headingRect = heading.getBoundingClientRect()
  const targets: PointTarget[] = []

  for (const span of heading.querySelectorAll<HTMLElement>(
    '[data-particle-line]',
  )) {
    const rect = span.getBoundingClientRect()

    if (rect.width < 1 || rect.height < 1) {
      continue
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
      continue
    }

    offscreenContext.font =
      `${style.fontStyle} ${style.fontWeight} ` +
      `${style.fontSize} ${style.fontFamily}`
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
    offscreenContext.fillText(
      text,
      0,
      (offscreen.height + ascent - descent) / 2,
    )

    const image = offscreenContext.getImageData(
      0,
      0,
      offscreen.width,
      offscreen.height,
    )
    const tone: ParticleTone = span.dataset.tone === 'muted' ? 'muted' : 'ink'
    const offsetX = rect.left - headingRect.left
    const offsetY =
      rect.top - headingRect.top - (offscreen.height - rect.height) / 2

    for (const point of collectTargets(image, sampleStride(fontSize), tone)) {
      targets.push({
        x: point.x + offsetX,
        y: point.y + offsetY,
        tone,
      })
    }
  }

  return thinTargets(targets, MAX_POINTS)
}
