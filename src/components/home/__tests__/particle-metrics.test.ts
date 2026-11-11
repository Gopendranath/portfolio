import { describe, expect, it } from 'vitest'
import {
  clampDpr,
  dustBudget,
  particleScaleForFontSize,
} from '../particle-name/metrics'

describe('clampDpr', () => {
  it('caps the backing resolution at 3x', () => {
    expect(clampDpr(1)).toBe(1)
    expect(clampDpr(2)).toBe(2)
    expect(clampDpr(4)).toBe(3)
  })

  it('falls back to 1 when the ratio is missing', () => {
    expect(clampDpr(undefined)).toBe(1)
    expect(clampDpr(0)).toBe(1)
  })
})

describe('particleScaleForFontSize', () => {
  it('floors small headings and caps large ones', () => {
    expect(particleScaleForFontSize(48)).toBe(0.9)
    expect(particleScaleForFontSize(64)).toBe(0.9)
    expect(particleScaleForFontSize(96)).toBe(1)
    expect(particleScaleForFontSize(192)).toBe(1)
  })

  it('falls back for invalid font sizes', () => {
    expect(particleScaleForFontSize(0)).toBe(0.9)
    expect(particleScaleForFontSize(Number.NaN)).toBe(0.9)
  })
})

describe('dustBudget', () => {
  it('keeps the desktop proportional count', () => {
    expect(
      dustBudget({ particleCount: 2200, particleScale: 1, width: 900 }),
    ).toBe(330)
  })

  it('floors the count on narrow headings', () => {
    expect(
      dustBudget({ particleCount: 2000, particleScale: 0.9, width: 430 }),
    ).toBe(150)
  })

  it('caps the count on very wide headings', () => {
    expect(
      dustBudget({ particleCount: 10000, particleScale: 1, width: 1600 }),
    ).toBe(420)
  })

  it('never returns zero dust', () => {
    expect(dustBudget({ particleCount: 0, particleScale: 1, width: 320 })).toBe(
      150,
    )
  })
})
