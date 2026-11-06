const EDGE_TOLERANCE = 8

export interface ScrollEdges {
  atTop: boolean
  atBottom: boolean
}

export function resolveScrollEdges(
  scrollY: number,
  scrollHeight: number,
  viewportHeight: number,
): ScrollEdges {
  const maxScroll = Math.max(0, scrollHeight - viewportHeight)

  return {
    atTop: scrollY <= EDGE_TOLERANCE,
    atBottom: scrollY >= maxScroll - EDGE_TOLERANCE,
  }
}
