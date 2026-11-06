import { describe, expect, it } from 'vitest'
import { resolveScrollEdges } from '../scroll'

describe('resolveScrollEdges', () => {
  it('hides the top blur at the top of a scrollable page', () => {
    expect(resolveScrollEdges(0, 2000, 800)).toEqual({
      atTop: true,
      atBottom: false,
    })
  })

  it('shows both edges in the middle of a scrollable page', () => {
    expect(resolveScrollEdges(600, 2000, 800)).toEqual({
      atTop: false,
      atBottom: false,
    })
  })

  it('hides the bottom blur at the end of a scrollable page', () => {
    expect(resolveScrollEdges(1200, 2000, 800)).toEqual({
      atTop: false,
      atBottom: true,
    })
  })

  it('hides both edges when the page does not scroll', () => {
    expect(resolveScrollEdges(0, 500, 800)).toEqual({
      atTop: true,
      atBottom: true,
    })
  })

  it('treats the edge tolerance as already at the edge', () => {
    expect(resolveScrollEdges(4, 2000, 800).atTop).toBe(true)
    expect(resolveScrollEdges(1196, 2000, 800).atBottom).toBe(true)
  })
})
