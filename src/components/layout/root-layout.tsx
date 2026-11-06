import { Outlet, useRouterState } from '@tanstack/react-router'
import { profile } from '../../data/profile'
import { siteYear } from '../../lib/site'
import { Devtools } from '../devtools'
import { ThemeProvider } from '../theme/theme-context'
import { WebMcpTools } from '../webmcp/webmcp-tools'
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
        <WebMcpTools />
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
            className="safe-x safe-x-lg mx-auto w-full max-w-[1120px] flex-1 animate-page-in py-10 focus:outline-none lg:py-16"
          >
            <Outlet />
          </main>

          <footer className="border-t border-line">
            <div className="safe-x safe-x-lg mx-auto flex w-full max-w-[1120px] flex-col gap-4 py-8 md:flex-row md:items-center md:justify-between">
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
