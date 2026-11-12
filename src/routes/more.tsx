import { createFileRoute, Link } from '@tanstack/react-router'
import { AppearanceControls } from '@/components/appearance/appearance-controls'
import { ExternalLink } from '@/components/ui/external-link'
import { FactList } from '@/components/ui/fact-list'
import { ArrowRightIcon } from '@/components/ui/icons'
import { PageHeader } from '@/components/ui/page-header'
import { PageSection } from '@/components/ui/page-section'
import { StackTags } from '@/components/ui/stack-tags'
import { pageMeta } from '@/data/pages'
import { siteFacts, siteFeatures, siteStack } from '@/data/site'
import { pageHead } from '@/lib/seo'

export const Route = createFileRoute('/more')({
  head: () => pageHead(pageMeta.more.title, pageMeta.more.description, pageMeta.more.path),
  component: MorePage,
})

function MorePage() {
  return (
    <div>
      <PageHeader
        eyebrow="06 / More"
        title="About this site."
        description="How the portfolio is built, what it can do, how to tune the look, and how the live chat backend works."
      />

      <section
        aria-label="About this site"
        className="mt-14 grid gap-10 border-t border-line pt-10 lg:grid-cols-[1.1fr_0.9fr]"
      >
        <div className="space-y-5 text-base leading-relaxed text-muted sm:text-lg">
          <p>
            This is the personal portfolio of Gopendranath Sasmal. The site is a client-rendered
            React application on Vercel, backed by Neon Postgres, Neon Auth, and a Neon Function for
            chat. No tracking scripts run.
          </p>
          <p>
            Content lives in typed data files, routes are file-based, and the production build ships
            as static assets. The chat backend uses the same GitHub identity as the rest of the
            site. The public GitHub API supplies the home-page snapshot outside chat.
          </p>
        </div>

        <FactList items={siteFacts} />
      </section>

      <PageSection label="Features" ariaLabel="Site features">
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {siteFeatures.map((feature, index) => (
            <article key={feature.title} className="border border-line bg-surface/40 p-5">
              <span className="font-mono text-[9px] tracking-[0.18em] text-muted">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h2 className="mt-4 text-lg font-medium text-ink">{feature.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{feature.body}</p>
            </article>
          ))}
        </div>
      </PageSection>

      <AppearanceControls />

      <PageSection label="SSH access">
        <div className="mt-6 border border-line bg-surface/40 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-medium text-ink">Terminal access to chat</h2>
            <span className="inline-flex items-center gap-2 border border-line px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
              <span className="size-1.5 bg-muted" aria-hidden="true" />
              Not available
            </span>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
            The chat backend is live on Neon Functions at `/chat`. SSH access is not implemented
            yet; when it exists, sessions will use the same GitHub identity as the web chat.
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            There is no public SSH endpoint today. The host and exact command will be published here
            once it is available; this page will not invent one.
          </p>
        </div>
      </PageSection>

      <PageSection label="Colophon">
        <StackTags items={siteStack} className="mt-6" />
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted">
          <ExternalLink
            href="https://github.com/Gopendranath"
            className="text-ink transition-colors hover:text-accent"
          >
            More work on GitHub
          </ExternalLink>
          <Link
            to="/chat"
            className="group inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-accent"
          >
            Open chat
            <ArrowRightIcon className="size-3.5 transition-transform duration-150 ease-out group-hover:translate-x-1" />
          </Link>
        </div>
      </PageSection>
    </div>
  )
}
