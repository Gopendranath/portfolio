import type { ComponentType, SVGProps } from 'react'
import {
  EllipsisIcon,
  FolderIcon,
  HomeIcon,
  MailIcon,
  MessageIcon,
  UserIcon,
} from '@/components/ui/icons'
import type { RoutePath } from '@/data/navigation'

export const navIcons: Record<RoutePath, ComponentType<SVGProps<SVGSVGElement>>> = {
  '/': HomeIcon,
  '/projects': FolderIcon,
  '/about': UserIcon,
  '/contact': MailIcon,
  '/chat': MessageIcon,
  '/more': EllipsisIcon,
}
