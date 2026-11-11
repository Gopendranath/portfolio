import { describe, expect, it } from 'vitest'
import { resolveTooltipPosition } from '../tooltip-position'

const viewport = { width: 1280, height: 800 }

function rect(overrides: Partial<DOMRect> = {}): DOMRect {
  return {
    x: 400,
    y: 400,
    width: 40,
    height: 20,
    top: 400,
    right: 440,
    bottom: 420,
    left: 400,
    ...overrides,
  } as DOMRect
}

describe('resolveTooltipPosition', () => {
  it('centers a top tooltip above the trigger', () => {
    expect(resolveTooltipPosition(rect(), 'top', viewport)).toEqual({
      left: 420,
      top: 392,
      placement: 'top',
    })
  })

  it('flips top placements below when the trigger is near the top bar', () => {
    expect(
      resolveTooltipPosition(
        rect({ top: 20, bottom: 40, y: 20 }),
        'top',
        viewport,
      ).placement,
    ).toBe('bottom')
    expect(
      resolveTooltipPosition(
        rect({ top: 20, bottom: 40, y: 20 }),
        'top-left',
        viewport,
      ).placement,
    ).toBe('bottom-left')
  })

  it('flips side placements when the viewport would clip them', () => {
    expect(
      resolveTooltipPosition(
        rect({ left: 1200, right: 1240, x: 1200 }),
        'right',
        viewport,
      ).placement,
    ).toBe('left')
    expect(
      resolveTooltipPosition(
        rect({ left: 40, right: 80, x: 40 }),
        'left',
        viewport,
      ).placement,
    ).toBe('right')
  })

  it('flips bottom placements above when the footer would clip them', () => {
    expect(
      resolveTooltipPosition(
        rect({ top: 770, bottom: 790 }),
        'bottom',
        viewport,
      ).placement,
    ).toBe('top')
  })

  it('clamps corner placements inside the viewport edges', () => {
    expect(
      resolveTooltipPosition(
        rect({ left: 2, right: 42, x: 2 }),
        'top-left',
        viewport,
      ).left,
    ).toBe(8)
    expect(
      resolveTooltipPosition(
        rect({ left: 1240, right: 1278, x: 1240 }),
        'bottom-right',
        viewport,
      ).left,
    ).toBe(1272)
  })

  it('clamps side placements vertically', () => {
    expect(
      resolveTooltipPosition(
        rect({ top: 4, bottom: 24, y: 4 }),
        'right',
        viewport,
      ).top,
    ).toBe(20)
  })
})
