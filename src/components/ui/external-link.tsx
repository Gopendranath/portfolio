import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { ArrowUpRightIcon } from './icons'

interface ExternalLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target' | 'rel'> {
  href: string
  children: ReactNode
  showIcon?: boolean
}

export function ExternalLink({
  href,
  children,
  showIcon = true,
  className = '',
  ...props
}: ExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className={`inline-flex items-center gap-1.5 ${className}`}
      {...props}
    >
      {children}
      {showIcon ? (
        <ArrowUpRightIcon className="size-3.5 shrink-0 transition-transform duration-150 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      ) : null}
    </a>
  )
}
