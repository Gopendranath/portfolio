import type { ComponentType, SVGProps } from 'react'
import { CoffeeIcon, GitHubIcon, LinkedInIcon, MailIcon, XIcon } from '@/components/ui/icons'
import { profile } from '@/data/profile'
import type { SocialId } from '@/data/types'
import { cn } from '@/lib/cn'
import { Tooltip, TooltipLink } from './tooltip'

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

interface SocialMeta {
  Icon: IconComponent
  color: string
}

const socialMeta: Record<SocialId, SocialMeta> = {
  github: { Icon: GitHubIcon, color: 'text-ink' },
  linkedin: { Icon: LinkedInIcon, color: 'text-[#0A66C2]' },
  x: { Icon: XIcon, color: 'text-ink' },
  coffee: { Icon: CoffeeIcon, color: 'text-[#B45309]' },
  email: { Icon: MailIcon, color: 'text-[#D93025]' },
}

interface SocialLinksProps {
  className?: string
  showLabels?: boolean
  exclude?: readonly SocialId[]
  boxClassName?: string
  iconClassName?: string
}

export function SocialLinks({
  className = '',
  showLabels = false,
  exclude,
  boxClassName = '',
  iconClassName = '',
}: SocialLinksProps) {
  const excluded = new Set<SocialId>(exclude ?? [])
  const socials = exclude
    ? profile.socials.filter((social) => !excluded.has(social.id))
    : profile.socials

  return (
    <ul className={cn('flex flex-wrap items-center gap-1', className)}>
      {socials.map((social) => {
        const { Icon, color } = socialMeta[social.id]
        const isExternal = social.href.startsWith('http')

        return (
          <li key={social.id} data-social={social.id}>
            <Tooltip label={social.label} placement="top-left">
              <TooltipLink
                href={social.href}
                aria-label={social.label}
                translate="no"
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noreferrer noopener' : undefined}
                className={
                  showLabels
                    ? 'inline-flex items-center gap-2 px-2 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition-colors hover:text-accent'
                    : cn(
                        'inline-flex size-9 items-center justify-center border border-line text-muted transition-colors hover:border-accent hover:text-accent',
                        boxClassName,
                      )
                }
              >
                <Icon className={cn('size-4 shrink-0', color, iconClassName)} />
                {showLabels ? <span>{social.label}</span> : null}
              </TooltipLink>
            </Tooltip>
          </li>
        )
      })}
    </ul>
  )
}
