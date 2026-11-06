export type SocialId = 'github' | 'linkedin' | 'x' | 'website' | 'email'

export interface SocialLink {
  id: SocialId
  label: string
  href: string
}

export interface StackGroup {
  title: string
  items: readonly string[]
}

export interface ProjectLink {
  label: string
  href: string
}

export interface Project {
  slug: string
  title: string
  year: string
  summary: string
  stack: readonly string[]
  links: readonly ProjectLink[]
  featured?: boolean
}

export type RoutePath =
  | '/'
  | '/projects'
  | '/about'
  | '/contact'
  | '/chat'
  | '/more'

export interface NavItem {
  index: string
  label: string
  to: RoutePath
}

export interface Profile {
  name: string
  firstName: string
  lastName: string
  role: string
  location: string
  timezone: string
  email: string
  availability: string
  bio: string
  about: readonly string[]
  socials: readonly SocialLink[]
  stack: readonly StackGroup[]
  resumeAvailable: boolean
}

export type ChatProfileId = 'assistant' | 'owner'

export type ChatAuthor = 'user' | ChatProfileId

export interface ChatProfile {
  id: ChatProfileId
  name: string
  role: string
}

export interface ChatMessage {
  id: string
  author: ChatAuthor
  body: string
  sentAt: number
  editedAt?: number
}
