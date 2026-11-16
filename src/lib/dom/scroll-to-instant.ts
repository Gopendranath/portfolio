type ImmediateScroller = (offset: number) => void

let immediateScroller: ImmediateScroller | null = null

/**
 * Lets a smooth-scroll engine (Lenis) own instant scroll writes, so virtualizer
 * corrections move the engine's internal position instead of fighting it.
 * Pass `null` on teardown.
 */
export function setImmediateScroller(scroller: ImmediateScroller | null) {
  immediateScroller = scroller
}

/**
 * Scroll adapter for window virtualizers. Measurement corrections have to land
 * in the same frame; a document with `scroll-behavior: smooth` would animate
 * them and leave the library's offset read-back lagging behind.
 */
export function scrollWindowInstant(offset: number, options: { behavior?: ScrollBehavior }) {
  const behavior = options.behavior ?? 'instant'

  if (immediateScroller && behavior !== 'smooth') {
    immediateScroller(offset)
    return
  }

  window.scrollTo({ top: offset, behavior })
}
