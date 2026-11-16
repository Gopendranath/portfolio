import { stackItemIcons } from '@/components/about/stack-icons'
import { ExternalLink } from '@/components/ui/external-link'
import { TechnologyIcon } from '@/components/ui/technology-icon'
import type { Project } from '@/data/types'

interface ProjectCardProps {
  project: Project
  index: number
}

export function ProjectCard({ project, index }: ProjectCardProps) {
  const iconic: string[] = []
  const textual: string[] = []

  for (const technology of project.stack) {
    if (stackItemIcons[technology]) iconic.push(technology)
    else textual.push(technology)
  }

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

      {iconic.length > 0 ? (
        <ul aria-label="Technologies" className="mt-6 flex flex-wrap items-center gap-3">
          {iconic.map((technology) => {
            const icon = stackItemIcons[technology]
            if (!icon) return null

            return (
              <li
                key={technology}
                title={technology}
                translate="no"
                className="flex text-muted transition-colors hover:text-ink"
              >
                <TechnologyIcon brand name={icon} className="size-5 shrink-0" />
                <span className="sr-only">{technology}</span>
              </li>
            )
          })}
        </ul>
      ) : null}

      {textual.length > 0 ? (
        <ul
          aria-label={iconic.length > 0 ? 'Other technologies' : 'Technologies'}
          className={`flex flex-wrap gap-1.5 ${iconic.length > 0 ? 'mt-3' : 'mt-6'}`}
        >
          {textual.map((technology) => (
            <li
              key={technology}
              translate="no"
              className="border border-line bg-canvas px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-muted"
            >
              {technology}
            </li>
          ))}
        </ul>
      ) : null}

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
