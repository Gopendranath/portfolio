import { useLayoutEffect, useState } from 'react'
import { resolveScrollEdges, type ScrollEdges } from '../../lib/scroll'

function readScrollEdges(): ScrollEdges {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { atTop: true, atBottom: true }
  }

  return resolveScrollEdges(
    window.scrollY,
    document.documentElement.scrollHeight,
    window.innerHeight,
  )
}

export function ScrollBlur() {
  const [edges, setEdges] = useState<ScrollEdges>(readScrollEdges)

  useLayoutEffect(() => {
    const update = () => {
      setEdges((current) => {
        const next = readScrollEdges()
        return current.atTop === next.atTop &&
          current.atBottom === next.atBottom
          ? current
          : next
      })
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)

    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
    // The parent remounts this component on navigation via `key={pathname}`.
  }, [])

  return (
    <>
      <div
        aria-hidden="true"
        className={`scroll-blur-top pointer-events-none fixed inset-x-0 top-16 z-20 h-24 bg-canvas/60 backdrop-blur-[8px] transition-opacity duration-200 lg:left-[280px] lg:top-0 ${
          edges.atTop ? 'opacity-0' : 'opacity-100'
        }`}
      />
      <div
        aria-hidden="true"
        className={`scroll-blur-bottom pointer-events-none fixed inset-x-0 bottom-0 z-20 h-24 bg-canvas/60 backdrop-blur-[8px] transition-opacity duration-200 lg:left-[280px] ${
          edges.atBottom ? 'opacity-0' : 'opacity-100'
        }`}
      />
    </>
  )
}
