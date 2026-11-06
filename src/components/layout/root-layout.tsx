import { Outlet, useRouterState } from '@tanstack/react-router'
import { profile } from '../../data/profile'
import { siteYear } from '../../lib/site'
import { Devtools } from '../devtools'
import { ThemeProvider } from '../theme/theme-context'
import { AppSidebar } from './app-sidebar'
import { MobileNav } from './mobile-nav'
import { ScrollBlur } from './scroll-blur'
import { SidebarProvider } from './sidebar-context'
import { SidebarRouteSync } from './sidebar-route-sync'
import { SkipLink } from './skip-link'

export function RootLayout() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  return (
    <ThemeProvider>
      <SidebarProvider>
        <SkipLink />
        <SidebarRouteSync />
        <AppSidebar />
        <MobileNav />
        <ScrollBlur pathname={pathname} />

        <div className="flex min-h-dvh flex-col lg:pl-[280px]">
          <main
            id="main-content"
            key={pathname}
            tabIndex={-1}
            className="mx-auto w-full max-w-[1120px] flex-1 animate-page-in px-5 py-10 focus:outline-none sm:px-8 lg:px-12 lg:py-16"
          >
            <Outlet />
          </main>

          <footer className="border-t border-line">
            <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-4 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
                © {siteYear} {profile.name}
              </p>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
                <span>{profile.location}</span>
                <a
                  href={`mailto:${profile.email}`}
                  className="transition-colors hover:text-accent"
                >
                  Email
                </a>
              </div>
            </div>
          </footer>
        </div>

        <Devtools />
      </SidebarProvider>
    </ThemeProvider>
  )
}
