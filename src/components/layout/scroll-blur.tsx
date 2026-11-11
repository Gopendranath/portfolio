import { useScrollEdges } from '../../lib/use-scroll-edges'

export function ScrollBlur() {
  const edges = useScrollEdges()

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
