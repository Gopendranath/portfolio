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

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      <div className="w-full max-w-[22rem] rounded-2xl border border-line bg-canvas/90 p-1.5 shadow-[0_10px_30px_rgb(0_0_0/0.35)] backdrop-blur-md">
        <ul className="flex items-stretch">
          {navItems.map((item) => {
            const isActive = isNavItemActive(pathname, item.to)
            const Icon = dockIcons[item.to]

            return (
              <li key={item.to} className="min-w-0 flex-1">
                <Link
                  to={item.to}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-1.5 transition-colors ${
                    isActive
                      ? 'bg-accent/10 text-accent'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  {isActive ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-accent"
                    />
                  ) : null}
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
