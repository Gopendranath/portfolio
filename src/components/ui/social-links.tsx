import type { ComponentType, SVGProps } from 'react'
import { GitHubIcon, GlobeIcon, LinkedInIcon, MailIcon, XIcon } from '@/components/ui/icons'
import { profile } from '@/data/profile'
import type { SocialId } from '@/data/types'
import { Tooltip, TooltipLink } from './tooltip'

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

const icons: Record<SocialId, IconComponent> = {
  github: GitHubIcon,
  linkedin: LinkedInIcon,
  x: XIcon,
  website: GlobeIcon,
  email: MailIcon,
}

interface SocialLinksProps {
  className?: string
  showLabels?: boolean
}

export function SocialLinks({ className = '', showLabels = false }: SocialLinksProps) {
  return (
    <ul className={`flex flex-wrap items-center gap-1 ${className}`}>
      {profile.socials.map((social) => {
        const Icon = icons[social.id]
        const isExternal = social.href.startsWith('http')

        return (
          <li key={social.id}>
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
                    : 'inline-flex size-9 items-center justify-center border border-line text-muted transition-colors hover:border-accent hover:text-accent'
                }
              >
                <Icon className="size-4" />
                {showLabels ? <span>{social.label}</span> : null}
              </TooltipLink>
            </Tooltip>
          </li>
        )
      })}
    </ul>
  )
}
