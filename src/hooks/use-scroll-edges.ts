import { useLayoutEffect, useState } from 'react'
import { resolveScrollEdges, type ScrollEdges } from '@/lib/dom/scroll'

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

export function useScrollEdges(): ScrollEdges {
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
  }, [])

  return edges
}
