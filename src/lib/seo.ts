export const SITE_TITLE = 'Gopendranath Sasmal — Full Stack Developer'

export const SITE_DESCRIPTION =
  'Full-stack developer in Bengaluru building web products across React, TypeScript, Java, Spring Boot, Node.js, and AI. Open to full-stack roles.'

export function pageHead(title: string, description: string) {
  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'website' },
      { property: 'og:image', content: '/og-image.png' },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:image:alt', content: SITE_TITLE },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:image', content: '/og-image.png' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
    ],
  }
}
