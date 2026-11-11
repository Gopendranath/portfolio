import { Link, useRouterState } from '@tanstack/react-router'
import { useLayoutEffect, useRef, useState } from 'react'
import { navItems } from '@/data/navigation'
import { isNavItemActive } from '@/lib/routing/active'

interface PrimaryNavProps {
  className?: string
  onNavigate?: () => void
}

interface IndicatorPosition {
  top: number
  height: number
}

export function PrimaryNav({ className = '', onNavigate }: PrimaryNavProps) {
  const navRef = useRef<HTMLElement>(null)
  const itemRefs = useRef<Array<HTMLLIElement | null>>([])
  const [indicator, setIndicator] = useState<IndicatorPosition | null>(null)
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const activeIndex = navItems.findIndex((item) =>
    isNavItemActive(pathname, item.to),
  )

  useLayoutEffect(() => {
    const nav = navRef.current
    const activeItem = itemRefs.current[activeIndex]

    if (!nav || !activeItem) {
      setIndicator(null)
      return
    }

    const update = () => {
      const navRect = nav.getBoundingClientRect()
      const itemRect = activeItem.getBoundingClientRect()

      if (itemRect.height === 0) {
        setIndicator(null)
        return
      }

      setIndicator({
        top: itemRect.top - navRect.top + 4,
        height: itemRect.height - 8,
      })
    }

    update()

    const observer = new ResizeObserver(update)
    observer.observe(nav)
    observer.observe(activeItem)
    window.addEventListener('resize', update)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [activeIndex])

  return (
    <nav aria-label="Primary" className={`relative ${className}`} ref={navRef}>
      {indicator ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 w-px bg-accent transition-transform duration-300 ease-spring motion-reduce:transition-none"
          style={{
            height: indicator.height,
            transform: `translate3d(0, ${indicator.top}px, 0)`,
          }}
        />
      ) : null}
      <ul className="space-y-1">
        {navItems.map((item, index) => (
          <li
            key={item.to}
            ref={(node) => {
              itemRefs.current[index] = node
            }}
          >
            <Link
              to={item.to}
              onClick={onNavigate}
              activeProps={{ 'aria-current': 'page' }}
              className="group relative flex items-baseline gap-4 py-2.5 pl-4 pr-2 transition-colors hover:text-ink"
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`font-mono text-[10px] tracking-[0.18em] ${
                      isActive ? 'text-accent' : 'text-muted'
                    }`}
                  >
                    {item.index}
                  </span>
                  <span
                    className={`text-[15px] ${
                      isActive ? 'text-accent' : 'text-muted'
                    }`}
                  >
                    {item.label}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`ml-auto h-px w-6 self-center transition-colors ${
                      isActive ? 'bg-accent' : 'bg-line/60 group-hover:bg-muted'
                    }`}
                  />
                </>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
