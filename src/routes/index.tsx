import { createFileRoute, Link } from '@tanstack/react-router'
import { useAppearance } from '@/components/appearance/appearance-context'
import { ContributionGraph } from '@/components/home/contribution-graph'
import { GithubSnapshot } from '@/components/home/github-snapshot'
import { ProjectCard } from '@/components/projects/project-card'
import { ArrowRightIcon } from '@/components/ui/icons'
import { ScrambleText } from '@/components/ui/scramble-text'
import { SectionLabel } from '@/components/ui/section-label'
import { StatusBadge } from '@/components/ui/status-badge'
import { pageMeta } from '@/data/pages'
import { coreStack, profile } from '@/data/profile'
import { featuredProjects } from '@/data/projects'
import { ParticleName } from '@/features/particle-name'
import { pageHead } from '@/lib/seo'

export const Route = createFileRoute('/')({
  head: () =>
    pageHead(
      pageMeta.home.title,
      pageMeta.home.description,
      pageMeta.home.path,
    ),
  component: HomePage,
})

function HomePage() {
  const { particles } = useAppearance()

  return (
    <div className="space-y-20 sm:space-y-28">
      <section className="max-w-4xl">
        <p className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          <span className="h-px w-10 bg-accent" aria-hidden="true" />
          <ScrambleText text={profile.role} animateOnHover />
          <span> · Bengaluru, India</span>
        </p>

        <ParticleName
          enabled={particles.cloud}
          scan={particles.scan}
          dust={particles.dust}
          hover={particles.hover}
          className="mt-8 text-[clamp(3rem,8vw,6.5rem)] font-medium leading-[0.9] tracking-[-0.06em] text-ink"
          lines={[
            { text: profile.firstName },
            { text: profile.lastName, muted: true },
          ]}
        />

        <p className="mt-8 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          {profile.bio}
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            to="/projects"
            className="group inline-flex items-center gap-2 bg-accent px-5 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-accent-ink transition-colors hover:bg-ink"
          >
            View projects
            <ArrowRightIcon className="size-4 transition-transform duration-150 ease-out group-hover:translate-x-1" />
          </Link>
          <a
            href={`mailto:${profile.email}`}
            className="inline-flex items-center border border-line px-5 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted transition-colors hover:border-accent hover:text-accent"
          >
            Email me
          </a>
          <StatusBadge label={profile.availability} />
        </div>
      </section>

      <section aria-label="Selected work">
        <h2 className="sr-only">Selected work</h2>
        <div className="flex items-end justify-between gap-6">
          <SectionLabel className="flex-1">Selected work</SectionLabel>
          <Link
            to="/projects"
            className="group inline-flex shrink-0 items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-accent"
          >
            All projects
            <ArrowRightIcon className="size-3.5 transition-transform duration-150 ease-out group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="mt-8 grid gap-4 content-auto [contain-intrinsic-size:auto_500px] sm:grid-cols-2 xl:grid-cols-3">
          {featuredProjects.map((project, index) => (
            <ProjectCard
              key={project.slug}
              project={project}
              index={index + 1}
            />
          ))}
        </div>
      </section>

      <section aria-label="Core stack" className="border-t border-line pt-10">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <SectionLabel>Stack</SectionLabel>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted">
              The tools I reach for most, from interface work to the services
              behind it.
            </p>
          </div>

          <ul className="cursor-target grid grid-cols-2 gap-x-6 gap-y-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted sm:grid-cols-4">
            {coreStack.map((technology) => (
              <li
                key={technology}
                translate="no"
                className="flex items-center gap-2"
              >
                <span
                  className="size-1 shrink-0 bg-accent"
                  aria-hidden="true"
                />
                {technology}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <ContributionGraph />

      <GithubSnapshot />
    </div>
  )
}
