import { describe, expect, it } from 'vitest'
import { spring } from '@/components/ui/target-cursor-spring'

function run(stiffness: number, damping: number) {
  const state = { x: 0, v: 0 }

  for (let frame = 0; frame < 240; frame += 1) {
    spring(state, 100, stiffness, damping, 0.05)
  }

  return state
}

describe('spring', () => {
  it('stays bounded at the clamped rAF delta', () => {
    const state = run(2200, 2 * Math.sqrt(2200))

    expect(Number.isFinite(state.x)).toBe(true)
    expect(Math.abs(state.x)).toBeLessThan(1e6)
    expect(Math.abs(state.x - 100)).toBeLessThan(1)
  })

  it('stays bounded for the fastest hover response', () => {
    const state = run(8464, 114)

    expect(Number.isFinite(state.x)).toBe(true)
    expect(Math.abs(state.x)).toBeLessThan(1e6)
    expect(Math.abs(state.x - 100)).toBeLessThan(1)
  })
})
