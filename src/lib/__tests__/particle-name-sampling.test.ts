import { describe, expect, it } from 'vitest'
import { collectTargets, thinTargets } from '../particle-name'

describe('collectTargets', () => {
  it('keeps pixels above the alpha threshold at stride 1', () => {
    const image = {
      width: 2,
      height: 2,
      data: new Uint8ClampedArray([
        255, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 255,
      ]),
    }

    expect(collectTargets(image, 1, 'ink')).toEqual([
      { x: 0, y: 0, tone: 'ink' },
      { x: 1, y: 1, tone: 'ink' },
    ])
  })

  it('samples every other pixel at stride 2', () => {
    const data = new Uint8ClampedArray(4 * 4 * 4).fill(255)
    const image = { width: 4, height: 4, data }

    const points = collectTargets(image, 2, 'muted')

    expect(points).toHaveLength(4)
    expect(points).toEqual([
      { x: 0, y: 0, tone: 'muted' },
      { x: 2, y: 0, tone: 'muted' },
      { x: 0, y: 2, tone: 'muted' },
      { x: 2, y: 2, tone: 'muted' },
    ])
  })
})

describe('thinTargets', () => {
  it('returns the input when already under the cap', () => {
    const targets = [
      { x: 0, y: 0, tone: 'ink' as const },
      { x: 1, y: 1, tone: 'ink' as const },
    ]

    expect(thinTargets(targets, 4)).toBe(targets)
  })

  it('spreads survivors across the full list and keeps the tone', () => {
    const targets = Array.from({ length: 10 }, (_, index) => ({
      x: index,
      y: index,
      tone: 'ink' as const,
    }))

    const thinned = thinTargets(targets, 4)

    expect(thinned).toHaveLength(4)
    expect(thinned[0].x).toBe(0)
    expect(thinned[3].x).toBe(9)
    expect(thinned.every((point) => point.tone === 'ink')).toBe(true)
  })
})
