import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRightIcon } from '../components/ui/icons'
import { PageHeader } from '../components/ui/page-header'
import { SectionLabel } from '../components/ui/section-label'
import { pageHead } from '../lib/seo'

const plannedFeatures = [
  {
    title: 'GitHub sign-in',
    body: 'Every session starts with a verified GitHub identity, so conversations stay attributable and abuse stays limited.',
  },
  {
    title: 'AI assistant',
    body: 'Ask about projects, stack choices, or how a system was built. Answers come from the same curated portfolio data as the rest of the site.',
  },
  {
    title: 'Message the owner',
    body: 'When the assistant cannot help, leave a direct message. Replies will land in an owner-only inbox.',
  },
] as const

export const Route = createFileRoute('/chat')({
  head: () =>
    pageHead(
      'Chat — Gopendranath Sasmal',
      'A planned terminal-first chat with GitHub sign-in, an AI assistant, and a direct line to Gopendranath Sasmal.',
    ),
  component: ChatPage,
})

function ChatPage() {
  return (
    <div>
      <PageHeader
        eyebrow="05 / Chat"
        title="Talk to the terminal."
        description="A terminal-first chat is in development. GitHub sign-in, an AI assistant, and a direct line to me will share this route."
      />

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 border border-line bg-surface/60 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
          <span className="size-1.5 bg-accent" aria-hidden="true" />
          In development
        </span>
        <Link
          to="/contact"
          className="group inline-flex items-center gap-2 border border-line px-5 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted transition-colors hover:border-accent hover:text-accent"
        >
          Email me instead
          <ArrowRightIcon className="size-4 transition-transform duration-150 ease-out group-hover:translate-x-1" />
        </Link>
      </div>

      <section
        aria-label="Planned chat features"
        className="mt-16 border-t border-line pt-10"
      >
        <SectionLabel>On the roadmap</SectionLabel>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {plannedFeatures.map((feature, index) => (
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
        aria-label="Chat status"
        className="mt-16 border-t border-line pt-10"
      >
        <SectionLabel>Status</SectionLabel>
        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted">
          Chat needs a separate authenticated backend for GitHub OAuth,
          sessions, and message storage. Until that ships, this page stays a
          preview. No sign-in or message controls are active yet.
        </p>
      </section>
    </div>
  )
}
