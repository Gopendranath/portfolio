/**
 * Scroll adapter for window virtualizers. Measurement corrections have to land
 * in the same frame; a document with `scroll-behavior: smooth` would animate
 * them and leave the library's offset read-back lagging behind.
 */
export function scrollWindowInstant(offset: number, options: { behavior?: ScrollBehavior }) {
  window.scrollTo({ top: offset, behavior: options.behavior ?? 'instant' })
}
