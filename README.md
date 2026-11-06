# Gopendranath Sasmal — Portfolio

Personal portfolio for Gopendranath Sasmal, built as a single-page React app with a persistent sidebar. Dark technical visual system, real project data, and a small GitHub snapshot powered by TanStack Query.

## Stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS 4
- TanStack Router (file-based)
- TanStack Query
- Vitest + Testing Library

## Requirements

- Node.js `^22.22.2`, `^24.15.0`, or `>=26`
- pnpm 12+

## Development

```bash
pnpm install
pnpm dev
```

Open `http://localhost:5173`.

## Scripts

```bash
pnpm dev        # Vite dev server
pnpm build      # TypeScript project build + production bundle
pnpm preview    # Preview the production build
pnpm test       # Vitest run
pnpm test:watch # Vitest watch mode
pnpm lint       # Oxlint
```

## Project structure

```text
src/
  components/
    home/        GitHub snapshot
    layout/      sidebar, mobile drawer, shell, context
    projects/    project card
    ui/          headers, labels, icons, links, status
  data/          profile, navigation, projects, shared types
  lib/           query client, GitHub query, site constants
  routes/        file-based TanStack Router routes
  main.tsx
  index.css
  routeTree.gen.ts  # generated, do not edit
```

## Content

- `src/data/profile.ts` — name, bio, location, email, socials, availability, stack.
- `src/data/projects.ts` — project titles, summaries, stack tags, and links.
- `src/data/navigation.ts` — sidebar labels, indices, and paths.

Project data is curated locally. The Projects page does not call GitHub at runtime. The Home page fetches public profile statistics from the GitHub API through TanStack Query and falls back to a verified static snapshot when the API is unavailable or rate-limited.

## Routing

Routes are files under `src/routes`:

- `__root.tsx` — shell, document head, error/not-found states
- `index.tsx` — `/`
- `projects.tsx` — `/projects`
- `about.tsx` — `/about`
- `contact.tsx` — `/contact`

Adding a page means adding a route file and a navigation entry. The TanStack Router Vite plugin regenerates `src/routeTree.gen.ts`; never edit it manually.

## Data fetching

One QueryClient lives in `src/lib/query-client.ts`. It is injected into TanStack Router context and exposed to React through the Router `Wrap` option in `src/main.tsx`. GitHub statistics use `queryOptions` from `src/lib/github.ts`.

The public GitHub API is unauthenticated at runtime, so it can be rate-limited. The UI keeps working by rendering `GITHUB_FALLBACK`.

## Theme

Dark is the default. The sidebar and mobile drawer include a pill-style theme toggle; press `T` outside a form field to toggle from the keyboard. The choice is stored in `localStorage` under `theme` and applied before React mounts by a small inline script in `index.html` to avoid a flash.

Theme tokens live in `src/index.css`. `html[data-theme="light"]` overrides the dark palette, including the dot-grid color and browser `color-scheme`. The toggle also updates the `theme-color` meta tag.

## Images

The avatar comes from the GitHub profile (`https://avatars.githubusercontent.com/u/71755844`). It is pre-optimized into 160, 320, and 460px WebP variants under `src/assets/avatar/` and imported through Vite, so production filenames are content-hashed and cacheable. The sidebar uses the 160px variant; About requests the 320px/460px variants through `srcSet`.

See `src/assets/avatar/README.md` for the ffmpeg regeneration commands.

## Deployment

The site is a client-side SPA. The host must rewrite unknown paths to `index.html` so deep links such as `/projects` work.

Vercel (`vercel.json`):

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Netlify (`public/_redirects`):

```text
/* /index.html 200
```

## Notes

- Resume is intentionally a disabled placeholder until a PDF is added. Replace the disabled buttons in `contact.tsx` and `app-sidebar.tsx` with a link when the file is ready.
- The design uses one accent color and a dark-only theme. Theme tokens live in the `@theme` block in `src/index.css`.
- Tests cover content invariants, the GitHub fallback, the QueryClient defaults, sidebar state, project cards, and the GitHub snapshot.
