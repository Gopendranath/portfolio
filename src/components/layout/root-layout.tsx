import { Outlet, useRouterState } from '@tanstack/react-router'
import { Analytics } from '@vercel/analytics/react'
import { profile } from '../../data/profile'
import { siteYear } from '../../lib/site'
import { AppearanceProvider } from '../appearance/appearance-provider'
import { CursorLayer } from '../appearance/cursor-layer'
import { Devtools } from '../devtools'
import { ThemeProvider } from '../theme/theme-provider'
import { WebMcpTools } from '../webmcp/webmcp-tools'
import { AppSidebar } from './app-sidebar'
import { MobileDock } from './mobile-dock'
import { MobileHeader } from './mobile-header'
import { ScrollBlur } from './scroll-blur'
import { SkipLink } from './skip-link'

const CURSOR_TARGET_SELECTOR =
  '.cursor-target, a[href], button:not(:disabled), [role="button"], summary, input, textarea, select'

export function RootLayout() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const isChat = pathname === '/chat'

  return (
    <ThemeProvider>
      <AppearanceProvider>
        <WebMcpTools />
        <Analytics route={pathname} path={pathname} />
        <SkipLink />
        <AppSidebar />
        {/* Remount on navigation so scroll-edge state resets before the scroll event fires. */}
        <MobileHeader key={`header-${pathname}`} />
        <MobileDock />
        <ScrollBlur key={`scroll-${pathname}`} />

        <div
          className={
            isChat
              ? 'flex h-[calc(100dvh_-_4rem_-_var(--mobile-dock-space)_+_0.75rem)] flex-col overflow-hidden lg:h-dvh lg:pl-[280px]'
              : 'flex min-h-dvh flex-col pb-[var(--mobile-dock-space)] lg:pb-0 lg:pl-[280px]'
          }
        >
          <main
            id="main-content"
            key={pathname}
            tabIndex={-1}
            className={
              isChat
                ? 'flex min-h-0 w-full flex-1 animate-page-in flex-col overflow-hidden focus:outline-none'
                : 'safe-x safe-x-lg mx-auto w-full max-w-[1120px] flex-1 animate-page-in py-10 focus:outline-none lg:py-16'
            }
          >
            <Outlet />
          </main>

          {isChat ? null : (
            <footer className="border-t border-line">
              <div className="safe-x safe-x-lg mx-auto flex w-full max-w-[1120px] flex-col gap-4 py-8 md:flex-row md:items-center md:justify-between">
                <p className="cursor-target font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
                  © {siteYear} {profile.name}
                </p>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
                  <span className="cursor-target">{profile.location}</span>
                  <a
                    href={`mailto:${profile.email}`}
                    className="transition-colors hover:text-accent"
                  >
                    Email
                  </a>
                </div>
              </div>
            </footer>
          )}
        </div>

        <CursorLayer targetSelector={CURSOR_TARGET_SELECTOR} />
        <Devtools />
      </AppearanceProvider>
    </ThemeProvider>
  )
}
