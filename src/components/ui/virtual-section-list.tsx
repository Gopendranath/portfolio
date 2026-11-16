import { useWindowVirtualizer } from '@tanstack/react-virtual'
import {
  Fragment,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { cn } from '@/lib/cn'
import { scrollWindowInstant } from '@/lib/dom/scroll-to-instant'

export interface VirtualSection {
  id: string
  /** Estimated rendered height. Corrected by measurement on mount. */
  estimate: number
  content: ReactNode
}

interface VirtualSectionListProps {
  sections: readonly VirtualSection[]
  className?: string
}

type MediaQueryList = ReturnType<typeof window.matchMedia>

function printQuery(): MediaQueryList | null {
  return typeof window.matchMedia === 'function' ? window.matchMedia('print') : null
}

function subscribeToPrint(onChange: () => void) {
  const query = printQuery()
  query?.addEventListener('change', onChange)
  window.addEventListener('beforeprint', onChange)
  window.addEventListener('afterprint', onChange)

  return () => {
    query?.removeEventListener('change', onChange)
    window.removeEventListener('beforeprint', onChange)
    window.removeEventListener('afterprint', onChange)
  }
}

function isPrinting() {
  return printQuery()?.matches ?? false
}

function usePrintMedia() {
  return useSyncExternalStore(subscribeToPrint, isPrinting, () => false)
}

/**
 * Offset of the list from the top of the document, so window scrolling and the
 * virtualizer's item positions agree. Uses the layout offset chain rather than
 * bounding rects, which are skewed while the page-enter transform animates.
 * Re-measured when the content above the list changes height (font swap, theme
 * change, window resize).
 */
function documentOffsetTop(element: HTMLElement) {
  let top = 0
  let node: HTMLElement | null = element

  while (node) {
    top += node.offsetTop
    const parent = node.offsetParent as HTMLElement | null

    if (parent) {
      // `offsetTop` is measured from the parent's padding edge.
      top += parent.clientTop
    }

    node = parent
  }

  return Math.round(top)
}

function useScrollMargin(enabled: boolean) {
  const listRef = useRef<HTMLDivElement>(null)
  const [scrollMargin, setScrollMargin] = useState(0)

  useLayoutEffect(() => {
    const list = listRef.current

    if (!list || !enabled) {
      return
    }

    const update = () => {
      setScrollMargin(documentOffsetTop(list))
    }

    update()
    window.addEventListener('resize', update)
    const observer = new ResizeObserver(update)
    observer.observe(document.body)

    return () => {
      window.removeEventListener('resize', update)
      observer.disconnect()
    }
  }, [enabled])

  return { listRef, scrollMargin }
}

/**
 * Window-scrolled virtual list for page sections. Off-screen sections unmount,
 * so scroll cost stays flat as a page grows.
 *
 * Falls back to plain stacked sections when measurement is impossible (no
 * `ResizeObserver`, e.g. jsdom) or while printing, so the full document is
 * always available where windowing cannot work.
 */
export function VirtualSectionList({ sections, className }: VirtualSectionListProps) {
  const [canMeasure] = useState(() => typeof ResizeObserver !== 'undefined')
  const printing = usePrintMedia()
  const enabled = canMeasure && !printing
  const { listRef, scrollMargin } = useScrollMargin(enabled)

  const virtualizer = useWindowVirtualizer({
    enabled,
    count: sections.length,
    estimateSize: (index) => sections[index]?.estimate ?? 400,
    getItemKey: (index) => sections[index]?.id ?? index,
    scrollMargin,
    overscan: 2,
    useFlushSync: false,
    directDomUpdates: true,
    scrollToFn: scrollWindowInstant,
  })

  if (!enabled) {
    return (
      <div ref={listRef} className={cn(className)}>
        {sections.map((section) => (
          <Fragment key={section.id}>{section.content}</Fragment>
        ))}
      </div>
    )
  }

  const items = virtualizer.getVirtualItems()
  const { containerRef } = virtualizer

  return (
    <div ref={listRef} className={cn(className)} data-scroll-margin={scrollMargin}>
      <div ref={containerRef} className="relative">
        {items.map((item) => (
          <div
            key={item.key}
            data-index={item.index}
            ref={virtualizer.measureElement}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%' }}
          >
            {sections[item.index]?.content}
          </div>
        ))}
      </div>
    </div>
  )
}
