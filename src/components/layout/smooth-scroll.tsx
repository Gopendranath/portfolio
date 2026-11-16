import { useRouter } from '@tanstack/react-router'
import Lenis from 'lenis'
import { useEffect, useRef } from 'react'
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
 */
export function SmoothScroll() {
  const router = useRouter()
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: true,
      duration: 1.1,
      stopInertiaOnNavigate: true,
      syncTouch: false,
    })

    lenisRef.current = lenis
    setImmediateScroller((offset) => {
      lenis.scrollTo(offset, { immediate: true, force: true })
    })

    // Page height changes on navigation; keep Lenis's limits in step.
    const unsubscribe = router.subscribe('onResolved', () => {
      lenis.resize()
    })

    return () => {
      unsubscribe()
      setImmediateScroller(null)
      lenisRef.current = null
      lenis.destroy()
    }
  }, [router])

  return null
}
