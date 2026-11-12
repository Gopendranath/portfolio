import { SITE_DESCRIPTION, SITE_TITLE } from '../lib/seo.ts'
import type { RoutePath } from './navigation.ts'

export interface PageMeta {
  path: RoutePath
  title: string
  description: string
}

/**
 * Head metadata per route. The build also reads this to generate
 * `agent-catalog.json`, so page copy is described in exactly one place.
 */
export const pageMeta = {
  home: {
    path: '/',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  projects: {
    path: '/projects',
    title: 'Projects — Gopendranath Sasmal',
    description:
      'Selected full-stack projects across React, TypeScript, AI, WebAssembly, and browser tooling.',
  },
  about: {
    path: '/about',
    title: 'About — Gopendranath Sasmal',
    description:
      'About Gopendranath Sasmal, a full-stack developer focused on React, TypeScript, Node.js, AI, and maintainable product work.',
  },
  contact: {
    path: '/contact',
    title: 'Contact — Gopendranath Sasmal',
    description:
      'Get in touch with Gopendranath Sasmal about full-stack roles, product work, and collaborations.',
  },
  chat: {
    path: '/chat',
    title: 'Chat — Gopendranath Sasmal',
    description:
      'Message Gopendranath directly or talk to the portfolio assistant. GitHub sign-in is required; the assistant is limited to accounts at least one year old.',
  },
  more: {
    path: '/more',
    title: 'More — Gopendranath Sasmal',
    description:
      'How this portfolio is built, the features it ships, and the planned SSH access to its chat backend.',
  },
} as const satisfies Record<string, PageMeta>
