import { ExternalLink } from '@/components/ui/external-link'
import type { Project } from '@/data/types'

interface ProjectCardProps {
  project: Project
  index: number
}

export function ProjectCard({ project, index }: ProjectCardProps) {
  return (
    <article className="cursor-target group relative flex h-full flex-col border border-line bg-surface/60 p-5 transition-colors hover:border-muted/60 sm:p-6">
      <div className="flex items-center justify-between gap-4 font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
        <span>{String(index).padStart(2, '0')}</span>
        <span>{project.year}</span>
      </div>

      <h3 className="mt-8 break-words text-2xl font-medium tracking-[-0.025em] text-ink">
        {project.title}
      </h3>

      <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{project.summary}</p>

      <ul className="mt-6 flex flex-wrap gap-1.5">
        {project.stack.map((technology) => (
          <li
            key={technology}
            translate="no"
            className="border border-line bg-canvas px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-muted"
          >
            {technology}
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-4 font-mono text-[10px] uppercase tracking-[0.14em]">
        {project.links.map((link) => (
          <ExternalLink
            key={link.href}
            href={link.href}
            aria-label={`${link.label}: ${project.title}`}
            className="text-muted transition-colors hover:text-accent"
          >
            {link.label}
          </ExternalLink>
        ))}
      </div>
    </article>
  )
}
