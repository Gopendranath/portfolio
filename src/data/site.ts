export const siteFacts = [
  { label: 'Type', value: 'Static SPA + Neon backend' },
  { label: 'Rendering', value: 'Client-side React' },
  { label: 'Hosting', value: 'Vercel + Neon' },
  { label: 'Tracking', value: 'None' },
] as const

export const siteFeatures = [
  {
    title: 'Persistent navigation',
    body: 'A fixed sidebar on desktop and a floating bottom dock on small screens, with the current route marked.',
  },
  {
    title: 'Theme control',
    body: 'Dark by default, with a light palette that persists locally. Accent colors, cursor styles, and the animated hero name can be adjusted below.',
  },
  {
    title: 'Project index',
    body: 'Six curated projects with summaries, stack tags, and direct links to live demos or source code.',
  },
  {
    title: 'GitHub snapshot',
    body: 'Public profile statistics fetched at runtime, with a verified static fallback when the API is unavailable.',
  },
  {
    title: 'WebMCP tools',
    body: 'Five read-only tools expose profile, project, availability, and contact data to browser agents in supported Chromium builds.',
  },
  {
    title: 'Live chat backend',
    body: 'GitHub sign-in, a private owner thread, an owner inbox, and a streaming portfolio assistant backed by Neon Functions and Postgres.',
  },
  {
    title: 'Agent-readable summary',
    body: 'A plain-text llms.txt file mirrors the site content for agents that cannot execute JavaScript.',
  },
] as const

export const siteStack = [
  'React 19',
  'TypeScript',
  'Vite 8',
  'TanStack Router',
  'TanStack Query',
  'Tailwind CSS 4',
  'Vitest',
  'Vercel',
] as const
