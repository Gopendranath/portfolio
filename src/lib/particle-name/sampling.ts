import type { ParticleTone, PointTarget } from './types'

export const MIN_PARTICLES = 1800
export const MAX_PARTICLES = 4200
const PARTICLES_PER_CSS_PIXEL = 0.024

export function particleBudget(width: number, height: number, dpr = 1): number {
  const area = Math.max(0, width) * Math.max(0, height)
  const density = PARTICLES_PER_CSS_PIXEL / Math.sqrt(Math.max(1, dpr))
  const budget = Math.round(area * density)

  return Math.min(MAX_PARTICLES, Math.max(MIN_PARTICLES, budget))
}

export interface ImageBuffer {
  data: Uint8ClampedArray
  width: number
  height: number
}

export function sampleStride(fontSize: number): number {
  return Math.min(5, Math.max(2, Math.round(fontSize / 64)))
}

export function collectTargets(
  image: ImageBuffer,
  stride: number,
  tone: ParticleTone,
  alphaThreshold = 128,
): PointTarget[] {
  const targets: PointTarget[] = []
  const { data, width, height } = image

  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      const alpha = data[(y * width + x) * 4 + 3]

      if (alpha > alphaThreshold) {
        targets.push({ x, y, tone })
      }
    }
  }

  return targets
}

export function thinTargets(
  targets: readonly PointTarget[],
  max: number,
): PointTarget[] {
  if (max <= 0) {
    return []
  }

  if (targets.length <= max) {
    return targets as PointTarget[]
  }

  if (max === 1) {
    return [targets[Math.floor((targets.length - 1) / 2)]]
  }

  const thinned: PointTarget[] = []
  const lastIndex = targets.length - 1
  const lastPosition = max - 1

  for (let position = 0; position < max; position += 1) {
    thinned.push(targets[Math.round((position * lastIndex) / lastPosition)])
  }

  return thinned
}
