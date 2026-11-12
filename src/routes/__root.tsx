import { createRootRoute, HeadContent, Link, Scripts } from '@tanstack/react-router'
import { RootLayout } from '@/components/layout/root-layout'
import { pageMeta } from '@/data/pages'
import { pageHead } from '@/lib/seo'

export const Route = createRootRoute({
  head: () => pageHead(pageMeta.home.title, pageMeta.home.description),
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: ({ error, reset }) => (
    <section className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-6">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
        Something went wrong
      </p>
      <h1 className="text-3xl font-medium text-ink">The page could not load.</h1>
      <p className="text-muted">
        {error instanceof Error ? error.message : 'An unknown error occurred.'}
      </p>
      <button
        type="button"
        onClick={reset}
        className="w-fit border border-line px-5 py-3 font-mono text-sm text-ink transition-colors hover:border-accent hover:text-accent"
      >
        Try again
      </button>
    </section>
  ),
})

function RootComponent() {
  return (
    <>
      <HeadContent />
      <RootLayout />
      <Scripts />
    </>
  )
}

function NotFound() {
  return (
    <section className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-6">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">404</p>
      <h1 className="text-3xl font-medium text-ink">Page not found.</h1>
      <p className="text-muted">The address does not match a page on this site.</p>
      <Link
        to="/"
        className="w-fit border border-line px-5 py-3 font-mono text-sm text-ink transition-colors hover:border-accent hover:text-accent"
      >
        Back home
      </Link>
    </section>
  )
}
