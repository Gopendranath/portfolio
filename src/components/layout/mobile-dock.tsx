import { Link, useRouterState } from '@tanstack/react-router'
import type { ComponentType, SVGProps } from 'react'
import { navItems } from '../../data/navigation'
import type { RoutePath } from '../../data/types'
import { isNavItemActive } from '../../lib/navigation'
import {
  EllipsisIcon,
  FolderIcon,
  HomeIcon,
  MailIcon,
  MessageIcon,
  UserIcon,
} from '../ui/icons'

const dockIcons: Record<RoutePath, ComponentType<SVGProps<SVGSVGElement>>> = {
  '/': HomeIcon,
  '/projects': FolderIcon,
  '/about': UserIcon,
  '/contact': MailIcon,
  '/chat': MessageIcon,
  '/more': EllipsisIcon,
}

export function MobileDock() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const activeIndex = navItems.findIndex((item) =>
    isNavItemActive(pathname, item.to),
  )

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      <div className="relative w-full max-w-[24rem] border border-line bg-canvas/[0.92] shadow-[0_18px_36px_-22px_rgb(0_0_0/0.85)] backdrop-blur-md">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-px -top-px size-2 border-l border-t border-accent/50"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-px -top-px size-2 border-r border-t border-accent/50"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-px -left-px size-2 border-b border-l border-accent/50"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-px -right-px size-2 border-b border-r border-accent/50"
        />
        <ul className="relative flex items-stretch">
          {activeIndex >= 0 ? (
            <span
              aria-hidden="true"
              data-dock-indicator=""
              className="pointer-events-none absolute left-0 top-0 h-0.5 w-1/6 bg-accent transition-transform duration-300 ease-spring motion-reduce:transition-none"
              style={{ transform: `translateX(${activeIndex * 100}%)` }}
            />
          ) : null}
          {navItems.map((item, index) => {
            const isActive = isNavItemActive(pathname, item.to)
            const Icon = dockIcons[item.to]

            return (
              <li key={item.to} className="relative min-w-0 flex-1">
                {index > 0 ? (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-0 top-1/2 z-10 h-4 w-px -translate-y-1/2 bg-line"
                  />
                ) : null}
                <Link
                  to={item.to}
                  aria-current={isActive ? 'page' : undefined}
                  className={`mobile-dock-link relative flex min-h-12 flex-col items-center justify-center gap-[3px] px-0.5 py-2 transition-colors duration-150 ${
                    isActive
                      ? 'bg-accent/[0.06] text-accent'
                      : 'text-muted hover:bg-elevated/40 hover:text-ink'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`font-mono text-[7px] leading-none tracking-[0.2em] tabular-nums ${
                      isActive ? 'text-accent' : 'text-muted/55'
                    }`}
                  >
                    {item.index}
                  </span>
                  <Icon className="dock-icon size-[17px]" />
                  <span className="max-w-full truncate font-mono text-[clamp(7px,2.05vw,8px)] uppercase leading-none tracking-[0.12em]">
                    {item.label}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
