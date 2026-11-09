import type { ParticleTone, PointTarget } from './types'

export const MAX_POINTS = 8500

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
  if (targets.length <= max) {
    return targets as PointTarget[]
  }

  const thinned: PointTarget[] = []
  const lastIndex = targets.length - 1
  const lastPosition = max - 1

  for (let position = 0; position < max; position += 1) {
    thinned.push(targets[Math.round((position * lastIndex) / lastPosition)])
  }

  return thinned
}
