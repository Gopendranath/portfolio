const RESIZE_DEBOUNCE_MS = 120

export interface EnvironmentObserverCallbacks {
  onResize: () => void
  onMotionChange: (reduced: boolean) => void
  onVisibilityChange: (visible: boolean) => void
  onIntersectionChange: (onScreen: boolean) => void
  onDprChange: () => void
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Owns every DOM observer the particle canvas depends on, so the engine only
 * reacts to state changes instead of wiring media queries, visibility, resizes,
 * viewport intersection, and resolution changes itself.
 */
export function observeEnvironment(
  element: HTMLElement,
  callbacks: EnvironmentObserverCallbacks,
): () => void {
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  let dprQuery: MediaQueryList | null = null
  let resizeTimer: ReturnType<typeof setTimeout> | undefined

  const onMotionChange = () => callbacks.onMotionChange(motionQuery.matches)
  const onVisibilityChange = () => callbacks.onVisibilityChange(!document.hidden)
  const onResize = () => {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(callbacks.onResize, RESIZE_DEBOUNCE_MS)
  }
  const onDprChange = () => {
    callbacks.onDprChange()
    watchDpr()
  }

  function watchDpr() {
    dprQuery?.removeEventListener('change', onDprChange)
    dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
    dprQuery.addEventListener('change', onDprChange)
  }

  const resizeObserver = new ResizeObserver(onResize)
  resizeObserver.observe(element)

  const intersectionObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      callbacks.onIntersectionChange(entry.isIntersecting)
    }
  })
  intersectionObserver.observe(element)

  motionQuery.addEventListener('change', onMotionChange)
  document.addEventListener('visibilitychange', onVisibilityChange)
  watchDpr()

  return () => {
    clearTimeout(resizeTimer)
    resizeObserver.disconnect()
    intersectionObserver.disconnect()
    dprQuery?.removeEventListener('change', onDprChange)
    motionQuery.removeEventListener('change', onMotionChange)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
}
