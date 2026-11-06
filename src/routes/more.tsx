import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRightIcon } from '../components/ui/icons'
import { ExternalLink } from '../components/ui/external-link'
import { PageHeader } from '../components/ui/page-header'
import { SectionLabel } from '../components/ui/section-label'
import { pageHead } from '../lib/seo'

const siteFacts = [
  { label: 'Type', value: 'Static single-page app' },
  { label: 'Rendering', value: 'Client-side React' },
  { label: 'Hosting', value: 'Vercel' },
  { label: 'Tracking', value: 'None' },
] as const

const features = [
  {
    title: 'Persistent navigation',
    body: 'A fixed sidebar on desktop and an accessible dialog drawer on small screens, with the current route marked.',
  },
  {
    title: 'Theme control',
    body: 'Dark by default, with a light palette that persists locally. Press T outside a form field to toggle it.',
  },
  {
    title: 'Project index',
    body: 'Six curated projects with summaries, stack tags, and direct links to live demos or source code.',
  },
  {
    title: 'GitHub snapshot',
    body: 'Public profile statistics fetched at runtime, with a verified static fallback when the API is unavailable.',
  },
  {
    title: 'WebMCP tools',
    body: 'Five read-only tools expose profile, project, availability, and contact data to browser agents in supported Chromium builds.',
  },
  {
    title: 'Agent-readable summary',
    body: 'A plain-text llms.txt file mirrors the site content for agents that cannot execute JavaScript.',
  },
] as const

const stack = [
  'React 19',
  'TypeScript',
  'Vite 8',
  'TanStack Router',
  'TanStack Query',
  'Tailwind CSS 4',
  'Vitest',
  'Vercel',
] as const

export const Route = createFileRoute('/more')({
  head: () =>
    pageHead(
      'More — Gopendranath Sasmal',
      'How this portfolio is built, the features it ships, and the planned SSH access to its chat backend.',
    ),
  component: MorePage,
})

function MorePage() {
  return (
    <div>
      <PageHeader
        eyebrow="06 / More"
        title="About this site."
        description="How the portfolio is built, what it can do, and where the terminal-first chat is heading."
      />

      <section
        aria-label="About this site"
        className="mt-14 grid gap-10 border-t border-line pt-10 lg:grid-cols-[1.1fr_0.9fr]"
      >
        <div className="space-y-5 text-base leading-relaxed text-muted sm:text-lg">
          <p>
            This is the personal portfolio of Gopendranath Sasmal. It is a
            static, client-rendered React application: no server runtime, no
            database, and no tracking scripts.
          </p>
          <p>
            Content lives in typed data files, routes are file-based, and the
            production build ships as static assets. The only runtime network
            call is the public GitHub API used for the home-page snapshot.
          </p>
        </div>

        <dl className="divide-y divide-line border-y border-line">
          {siteFacts.map((fact) => (
            <div
              key={fact.label}
              className="flex items-start justify-between gap-6 py-3"
            >
              <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
                {fact.label}
              </dt>
              <dd className="text-right text-sm text-ink">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section
        aria-label="Site features"
        className="mt-20 border-t border-line pt-10"
      >
        <SectionLabel>Features</SectionLabel>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <article
              key={feature.title}
              className="border border-line bg-surface/40 p-5"
            >
              <span className="font-mono text-[9px] tracking-[0.18em] text-muted">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h2 className="mt-4 text-lg font-medium text-ink">
                {feature.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {feature.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        aria-label="SSH access"
        className="mt-20 border-t border-line pt-10"
      >
        <SectionLabel>SSH access</SectionLabel>
        <div className="mt-6 border border-line bg-surface/40 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-medium text-ink">
              Terminal access to chat
            </h2>
            <span className="inline-flex items-center gap-2 border border-line px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
              <span className="size-1.5 bg-muted" aria-hidden="true" />
              Planned
            </span>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
            The chat backend is planned to expose a real SSH endpoint, so the
            conversation can start from any terminal. Sessions will be tied to
            the GitHub identity used on the web.
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            There is no public SSH endpoint today. The host and exact command
            will be published here once the backend is live; this page will not
            invent one.
          </p>
        </div>
      </section>

      <section
        aria-label="Colophon"
        className="mt-20 border-t border-line pt-10"
      >
        <SectionLabel>Colophon</SectionLabel>
        <ul className="mt-6 flex flex-wrap gap-1.5">
          {stack.map((item) => (
            <li
              key={item}
              translate="no"
              className="border border-line bg-surface/60 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-muted"
            >
              {item}
            </li>
          ))}
        </ul>
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
            Chat roadmap
            <ArrowRightIcon className="size-3.5 transition-transform duration-150 ease-out group-hover:translate-x-1" />
          </Link>
        </div>
      </section>
    </div>
  )
}
