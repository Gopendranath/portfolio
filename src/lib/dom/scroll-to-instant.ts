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

export interface ScrollWindowOptions {
  /** Delta the virtualizer folded into its own bookkeeping, not yet written. */
  adjustments?: number
  behavior?: ScrollBehavior
}

/**
 * Scroll adapter for window virtualizers.
 *
 * Measurement corrections have to land in the same frame, so they write the
 * offset plus the virtualizer's `adjustments` immediately — a document with
 * `scroll-behavior: smooth` would animate them and leave the library's offset
 * read-back lagging behind.
 */
export function scrollWindowInstant(offset: number, options: ScrollWindowOptions) {
  const behavior = options.behavior ?? 'instant'
  const target = offset + (options.adjustments ?? 0)

  if (immediateScroller && behavior !== 'smooth') {
    immediateScroller(target)
    return
  }

  window.scrollTo({ top: target, behavior })
}
