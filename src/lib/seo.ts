export const SITE_TITLE = 'Gopendranath Sasmal — Full Stack Developer'

export const SITE_DESCRIPTION =
  'Full-stack developer in Bengaluru building web products across React, TypeScript, Java, Spring Boot, Node.js, and AI. Open to full-stack roles.'

export const SITE_ORIGIN = 'https://gopendra.is-a.dev'

export const siteYear = new Date().getFullYear()

/**
 * Per-route head. Social-card tags live in `index.html` (generated from these
 * same constants at build time) because link unfurlers do not run JavaScript;
 * duplicating them here would emit two of every tag. Pass `path` only for the
 * leaf routes, otherwise every page would inherit the home canonical.
 */
export function pageHead(title: string, description: string, path?: string) {
  return {
    meta: [{ title }, { name: 'description', content: description }],
    ...(path === undefined
      ? {}
      : {
          links: [
            {
              rel: 'canonical',
              href: `${SITE_ORIGIN}${path === '/' ? '' : path}`,
            },
          ],
        }),
  }
}
