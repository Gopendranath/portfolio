import { useRouter } from '@tanstack/react-router'
import Lenis from 'lenis'
import { useEffect } from 'react'
import { setImmediateScroller } from '@/lib/dom/scroll-to-instant'

/**
 * One inertial scroll engine for the whole site.
 *
 * Lenis drives the real window scroll position, so sticky/fixed chrome, the
 * scrollbar, keyboard scrolling, and the router's scroll restoration keep
 * working. Its immediate `scrollTo` is registered so virtualizer corrections
 * bypass the easing instead of fighting it.
 *
 * `anchors` is deliberately off: intercepting anchor clicks would stop the skip
 * link from moving focus to the main landmark.
 *
 * Any new `overflow-y-auto` / `overflow-x-auto` surface needs
 * `data-lenis-prevent` (or the `-horizontal` / `-vertical` variant), or Lenis
 * will swallow its wheel input.
 */
export function SmoothScroll() {
  const router = useRouter()

  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.15,
      stopInertiaOnNavigate: true,
      syncTouch: false,
      wheelMultiplier: 1.15,
    })

    let pendingCorrection: number | null = null

    const writeImmediate = (offset: number) => {
      lenis.scrollTo(offset, { immediate: true, force: true })
    }

    // An immediate write calls `reset()`, which would kill an in-flight ease
    // mid-gesture. Hold the correction until the ease settles instead.
    const applyCorrection = (offset: number) => {
      if (lenis.isScrolling === 'smooth') {
        pendingCorrection = offset
        return
      }

      writeImmediate(offset)
    }

    const flushCorrection = () => {
      if (pendingCorrection === null) {
        return
      }

      const offset = pendingCorrection
      pendingCorrection = null
      writeImmediate(offset)
    }

    setImmediateScroller(applyCorrection)
    window.addEventListener('scrollend', flushCorrection)

    // Page height changes on navigation; keep Lenis's limits in step.
    const unsubscribe = router.subscribe('onResolved', () => {
      lenis.resize()
    })

    return () => {
      unsubscribe()
      window.removeEventListener('scrollend', flushCorrection)
      setImmediateScroller(null)
      lenis.destroy()
    }
  }, [router])

  return null
}
