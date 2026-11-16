import { useEffect, useRef, useState } from 'react'
import { PauseIcon, PlayIcon } from '@/components/ui/icons'
import { TechnologyIcon, type TechnologyIconName } from '@/components/ui/technology-icon'

interface Technology {
  name: string
  icon: TechnologyIconName
}

const technologies: readonly Technology[] = [
  { name: 'React', icon: 'react' },
  { name: 'TypeScript', icon: 'typescript' },
  { name: 'Next.js', icon: 'nextjs' },
  { name: 'Node.js', icon: 'nodejs' },
  { name: 'Java', icon: 'java' },
  { name: 'Spring Boot', icon: 'springboot' },
  { name: 'Spring AI', icon: 'spring' },
  { name: 'Tailwind CSS', icon: 'tailwind' },
  { name: 'PostgreSQL', icon: 'postgresql' },
  { name: 'Redis', icon: 'redis' },
  { name: 'LangChain', icon: 'langchain' },
  { name: 'Docker', icon: 'docker' },
]

interface TechnologyListProps {
  className: string
  decorative?: boolean
}

function TechnologyList({ className, decorative = false }: TechnologyListProps) {
  return (
    <ul className={className} aria-hidden={decorative || undefined}>
      {technologies.map((technology) => (
        <li
          key={technology.name}
          translate="no"
          className="group/item flex shrink-0 items-center gap-2.5 text-muted transition-colors hover:text-ink"
        >
          <TechnologyIcon
            name={technology.icon}
            className="size-5 shrink-0 transition-colors group-hover/item:text-accent"
          />
          <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
            {technology.name}
          </span>
        </li>
      ))}
    </ul>
  )
}

interface TechnologyStackProps {
  className?: string
}

export function TechnologyStack({ className }: TechnologyStackProps) {
  const marqueeRef = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)
  const [inView, setInView] = useState(true)

  useEffect(() => {
    const node = marqueeRef.current

    if (!node || typeof IntersectionObserver === 'undefined') {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry?.isIntersecting ?? true),
      { rootMargin: '200px 0px' },
    )

    observer.observe(node)

    return () => observer.disconnect()
  }, [])

  return (
    <section aria-label="Technology stack" className={className}>
      <div
        ref={marqueeRef}
        className="technology-marquee"
        data-active={inView}
        data-paused={paused}
      >
        <div className="marquee-track">
          <TechnologyList className="marquee-list" />
          <TechnologyList className="marquee-list marquee-clone" decorative />
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={() => setPaused((value) => !value)}
          className="marquee-control -mr-1.5 min-h-6 items-center gap-1.5 px-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-accent"
        >
          {paused ? <PlayIcon className="size-3" /> : <PauseIcon className="size-3" />}
          {paused ? 'Play' : 'Pause'}
        </button>
      </div>
    </section>
  )
}
