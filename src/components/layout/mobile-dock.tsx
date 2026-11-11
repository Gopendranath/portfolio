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
      <div className="w-full max-w-[22rem] rounded-2xl border border-line bg-canvas/90 p-1.5 shadow-[0_16px_40px_-12px_rgb(0_0_0/0.7),0_4px_12px_rgb(0_0_0/0.35),inset_0_1px_0_rgb(255_255_255/0.04)] backdrop-blur-md">
        <ul className="relative flex items-stretch">
          {activeIndex >= 0 ? (
            <span
              aria-hidden="true"
              data-dock-indicator=""
              className="pointer-events-none absolute inset-y-0 left-0 w-1/6 rounded-xl bg-accent/10 shadow-[0_6px_18px_-6px_rgb(0_0_0/0.55),inset_0_1px_0_rgb(255_255_255/0.06)] ring-1 ring-accent/10 ring-inset transition-transform duration-300 ease-spring motion-reduce:transition-none"
              style={{ transform: `translateX(${activeIndex * 100}%)` }}
            />
          ) : null}
          {navItems.map((item) => {
            const isActive = isNavItemActive(pathname, item.to)
            const Icon = dockIcons[item.to]

            return (
              <li key={item.to} className="min-w-0 flex-1">
                <Link
                  to={item.to}
                  aria-current={isActive ? 'page' : undefined}
                  className={`mobile-dock-link relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-1.5 transition-colors ${
                    isActive ? 'text-accent' : 'text-muted hover:text-ink'
                  }`}
                >
                  <Icon className="size-[18px]" />
                  <span className="max-w-full truncate font-mono text-[8px] uppercase">
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
