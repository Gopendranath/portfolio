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
    ],
  }
}
