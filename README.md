# Gopendranath Sasmal — Portfolio

Personal portfolio for Gopendranath Sasmal, built as a single-page React app with a persistent sidebar. Dark technical visual system, real project data, and a small GitHub snapshot powered by TanStack Query.

Live: <https://gopendra.is-a.dev>

## Stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS 4
- TanStack Router (file-based)
- TanStack Query
- Biome
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
pnpm typecheck  # tsc project references, no emit
pnpm preview    # Preview the production build
pnpm test       # Vitest run
pnpm test:watch # Vitest watch mode
pnpm lint       # Biome lint
pnpm check      # Biome formatting and lint check
pnpm format     # Write Biome formatting
```

## Project structure

```text
src/
  components/
    appearance/  accent, cursor, and hero-name preferences
    chat/        assistant and owner chat preview
    home/        GitHub snapshot and contribution graph
    layout/      sidebar, mobile header and dock, shell
    projects/    project card
    theme/       dark/light theme provider and toggle
    ui/          shared primitives (page section, facts, stack tags)
  data/          profile, navigation, projects, about, site copy, page meta, types
  features/
    particle-name/  simulation/ (pure math) + engine/ (canvas, DOM)
    portrait-ripple/ WebGL portrait scene and its React adapters
  hooks/         shared React hooks (scroll edges, reduced motion)
  lib/
    dom/ github/ query/ routing/ text/   small focused modules
    seo.ts         head/meta factory and site constants
    preferences.ts versioned appearance/theme storage
    appearance.ts  accent and particle preference model
    webmcp/        Model Context Protocol tool definitions
  routes/        file-based TanStack Router routes (thin page wiring)
  styles/        shared utilities extracted from the global sheet
  main.tsx
  index.css
  routeTree.gen.ts  # generated, do not edit
```

Layering rules: `lib` never imports `data` or `components`; `features` may import `lib`; `components` may import both; `data` may import `lib` constants but not components. `strict` and `noUncheckedIndexedAccess` are on.

Import style: `@/` (aliased to `src/`) for anything in another folder, `./` for siblings. Biome's `noRestrictedImports` fails the build on `../` specifiers so the alias cannot drift back. `@` is declared in three places that must stay in sync: `vite.config.ts`, `vitest.config.ts` (it does not merge the Vite config), and `tsconfig.app.json` `paths`.

Tests live in `__tests__` folders beside the module they cover.

## Generated shell

`vite.config.ts` generates three things from app constants, so nothing drifts:

- the document head and pre-paint boot script (`index.html` tokens), so a stored accent never flashes the default lime,
- the Agentic Resource Discovery manifest, emitted as `/.well-known/ard.json` and — for consumers still looking for the predecessor name — `/.well-known/ai-catalog.json`, both from one source,
- `agent-catalog.json`, the resource that manifest entry points at. It carries the same ARD core (`specVersion` + `entries`) so it validates as a manifest too, plus the site-catalog members (`pages`, `tools`) that ARD ignores as transport-defined.

All three documents validate with zero errors and zero warnings against the ARD conformance tester Lighthouse uses (`lighthouse/third-party/ard`). Discovery uses the modern signals only (`rel="ard"` and the `/.well-known/ard.json` path), so the audit reports no legacy-location warning. `Agentmap:` in `robots.txt` is deliberately not used: Lighthouse's robots.txt validator rejects it as an unknown directive, which costs SEO points.

## Config imports

Anything `vite.config.ts` imports is also loaded by Vite's `configLoader: 'native'`, which resolves specifiers itself: aliases do not apply there. So that small subgraph keeps relative, extension-explicit specifiers — in practice `src/data/pages.ts`, `src/lib/webmcp/profile-tools.ts`, and `src/lib/webmcp/project-tools.ts` — and Biome's `noRestrictedImports` override exempts exactly those three files. The rest of the app keeps extensionless `@/…` imports, valid under `moduleResolution: "bundler"`. If you add a module to that graph, use relative specifiers with the extension or Vite will warn.

## Preferences

Appearance lives in one versioned `localStorage` key, `appearance:v1`, parsed by `src/lib/preferences.ts`. Legacy per-setting keys are migrated once and removed. Theme stays in `theme` and is synced across tabs, as are appearance changes.

## Content

- `src/data/profile.ts` — name, bio, location (with its Google Maps link), email, socials, availability, stack.
- `src/data/projects.ts` — project titles, summaries, stack tags, and links.
- `src/data/navigation.ts` — nav labels, indices, and paths (the route union is derived from it).
- `src/data/pages.ts` — per-route title and description used by both the router head and the agent catalog.
- `src/lib/github/contributions-fallback.ts` — committed daily fallback counts for the contribution heatmap.


Project data is curated locally. The Projects page does not call GitHub at runtime. The Home page fetches public profile statistics from the GitHub API through TanStack Query and falls back to a verified static snapshot when the API is unavailable or rate-limited. It also renders a 53-week contribution heatmap from the public [jogruber GitHub contributions API](https://github.com/grubersjoe/github-contributions-api), with a committed fallback containing a real year of daily counts.

## Routing

Routes are files under `src/routes`:

- `__root.tsx` — shell, document head, error/not-found states
- `index.tsx` — `/`
- `projects.tsx` — `/projects`
- `about.tsx` — `/about`
- `contact.tsx` — `/contact`
- `chat.tsx` — `/chat` (full-page interactive local preview; no chat backend yet)
- `more.tsx` — `/more` (site details and planned SSH access)

Adding a page means adding a route file and a navigation entry. The TanStack Router Vite plugin regenerates `src/routeTree.gen.ts`; never edit it manually.

## Data fetching

One QueryClient lives in `src/lib/query-client.ts`. It is injected into TanStack Router context and exposed to React through the Router `Wrap` option in `src/main.tsx`. GitHub statistics use `queryOptions` from `src/lib/github.ts`.

The public GitHub API is unauthenticated at runtime, so it can be rate-limited. The UI keeps working by rendering `GITHUB_FALLBACK`.

## Theme

Dark is the default. The sidebar and mobile header include a pill-style theme toggle; press `T` outside a form field to toggle from the keyboard. The choice is stored in `localStorage` under `theme` and applied before React mounts by a small inline script in `index.html` to avoid a flash.

Theme tokens live in `src/index.css`. `html[data-theme="light"]` overrides the dark palette, including the dot-grid color and browser `color-scheme`. The toggle also updates the `theme-color` meta tag.

## Images

The avatar comes from the GitHub profile (`https://avatars.githubusercontent.com/u/71755844`). It is pre-optimized into 160, 320, and 460px WebP variants under `src/assets/avatar/` and imported through Vite, so production filenames are content-hashed and cacheable. The sidebar uses the 160px variant; About requests the 320px/460px variants through `srcSet`.

See `src/assets/avatar/README.md` for the ffmpeg regeneration commands.

## Deployment

The site is a static client-side SPA. No server runtime, environment variables, or database are required.

### Required steps

1. Use Node.js `^22.22.2`, `^24.15.0`, or `>=26` with pnpm 12+.
2. Install dependencies from the lockfile:

   ```bash
   pnpm install --frozen-lockfile
   ```

3. Build the production bundle:

   ```bash
   pnpm build
   ```

   This runs `tsc -b` then Vite and writes `dist/`. A TypeScript error fails the build.

4. Configure SPA rewrites so unknown paths serve `index.html`. Deep links such as `/projects` break without this.

   Vercel (`vercel.json` at the repository root):

   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```

   Netlify (`public/_redirects`):

   ```text
   /* /index.html 200
   ```

5. Serve `dist/` over HTTPS.

### WebMCP in production

WebMCP is progressive enhancement. Without an Origin Trial token, the site works normally and the five tools are only exposed in Chromium with `chrome://flags/#enable-webmcp-testing`.

To expose the tools to regular Chrome users:

1. Register the exact production origin at the [Chrome WebMCP Origin Trial](https://developer.chrome.com/origintrials/#/register_trial/4163014905550602241). Enter the origin only, with no path. Chrome 149+ is required.
2. Add the generated token to the `<head>` of `index.html` before building:

   ```html
   <meta http-equiv="origin-trial" content="PASTE_TOKEN_HERE" />
   ```

   The token is public and safe to commit. It is bound to one origin, so preview deployments and new custom domains need their own registration.

3. Rebuild and redeploy, then verify in Chrome with the testing flag off:

   ```js
   await document.modelContext.getTools()
   ```

   Expect `get-profile`, `list-projects`, `get-project`, `check-availability`, and `get-contact`.

4. Renew the token before it expires. Chrome tokens typically last about six weeks; the Origin Trials portal shows the exact date.

Microsoft Edge uses a separate [Origin Trials program](https://developer.microsoft.com/microsoft-edge/origin-trials). A Chrome token does not enable WebMCP in Edge.

## Notes

- Resume is intentionally a disabled placeholder until a PDF is added. Replace the disabled buttons in `contact.tsx` and `app-sidebar.tsx` with a link when the file is ready.
- The design uses one accent color and a dark-only theme. Theme tokens live in the `@theme` block in `src/index.css`.
- Tests cover content invariants, the GitHub fallback, the QueryClient defaults, sidebar state, project cards, and the GitHub snapshot.
