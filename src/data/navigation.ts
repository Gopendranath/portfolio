/** Single source of truth for the site's routes and their nav metadata. */
export const navItems = [
  { index: '01', label: 'Home', to: '/' },
  { index: '02', label: 'Projects', to: '/projects' },
  { index: '03', label: 'About', to: '/about' },
  { index: '04', label: 'Contact', to: '/contact' },
  { index: '05', label: 'Chat', to: '/chat' },
  { index: '06', label: 'More', to: '/more' },
] as const

export type RoutePath = (typeof navItems)[number]['to']
