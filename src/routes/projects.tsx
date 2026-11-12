import { createFileRoute } from '@tanstack/react-router'
import { ProjectCard } from '@/components/projects/project-card'
import { ExternalLink } from '@/components/ui/external-link'
import { PageHeader } from '@/components/ui/page-header'
import { SectionLabel } from '@/components/ui/section-label'
import { pageMeta } from '@/data/pages'
import { projects } from '@/data/projects'
import { pageHead } from '@/lib/seo'

export const Route = createFileRoute('/projects')({
  head: () =>
    pageHead(pageMeta.projects.title, pageMeta.projects.description, pageMeta.projects.path),
  component: ProjectsPage,
})

function ProjectsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="02 / Projects"
        title="Selected work"
        description="Six projects across product interfaces, AI systems, and browser tooling. Each one shipped or built to solve a real problem."
      />

      <h2 className="sr-only">All projects</h2>
      <div className="mt-14 flex items-center justify-between gap-6 border-t border-line pt-6">
        <SectionLabel className="flex-1">All projects</SectionLabel>
        <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
          {String(projects.length).padStart(2, '0')} projects
        </span>
      </div>

      <div className="mt-8 grid gap-4 content-auto [contain-intrinsic-size:auto_600px] md:grid-cols-2">
        {projects.map((project, index) => (
          <ProjectCard key={project.slug} project={project} index={index + 1} />
        ))}
      </div>

      <p className="mt-12 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
        More experiments on{' '}
        <ExternalLink
          href="https://github.com/Gopendranath"
          className="text-ink transition-colors hover:text-accent"
        >
          GitHub
        </ExternalLink>
      </p>
    </div>
  )
}
