# Portfolio Sidebar Site — Design Spec

- **Date:** 2026-11-06
- **Status:** Approved design, pending written-spec review
- **Project:** `portfolio-dev-v1`
- **Stack:** React 19, TypeScript, Vite 8, Tailwind CSS 4, TanStack Router, TanStack Query

## 1. Purpose

Replace the Vite starter page with a production-quality personal portfolio for **Gopendranath Sasmal**, a full-stack developer based in Bengaluru. The site presents real project work, a concise professional profile, and direct contact routes through a persistent sidebar shell.

The architecture must stay easy to extend: new pages should be a single route file, new projects should be a data edit, and future remote data should plug into TanStack Query without restructuring the app.

## 2. Goals

- Remove the scaffold page and all starter-specific styling/assets.
- Configure file-based TanStack Router with generated, type-safe routes.
- Configure TanStack Query with one QueryClient, Router context, and developer-only devtools.
- Build a responsive sidebar shell with Home, Projects, About, and Contact routes.
- Use real profile and project content gathered from GitHub and the user's `github-repos.txt`.
- Ship a dark, technical visual system that feels authored rather than template-generated.
- Keep the codebase typed, data-driven, accessible, and straightforward to maintain.

## 3. Non-goals

- No backend, database, authentication, CMS, or contact form.
- No fabricated employment history, testimonials, or client claims.
- No light theme or theme switcher in this version.
- No project detail routes yet; project cards link to GitHub and live deployments.
- No resume PDF yet; the UI shows an honest disabled placeholder.
- No live GitHub data on the Projects page. Projects remain curated static data until a later decision.

## 4. Content

### Identity

- **Name:** Gopendranath Sasmal
- **Role:** Full Stack Developer
- **Location:** BTM Layout, Bengaluru, India
- **Email:** gopendranathsasmal7@gmail.com
- **Availability:** Open to work
- **GitHub:** https://github.com/Gopendranath
- **LinkedIn:** https://linkedin.com/in/gns99
- **X:** https://x.com/AssassinsEmper1
- **Website:** https://t3rminal.vercel.app

### Profile copy

Short bio for Home:

> Full-stack developer building web products across React, TypeScript, Node.js, and AI. I care about interfaces that feel fast, systems that stay maintainable, and work that ships. Currently open to full-stack roles in Bengaluru or remote.

About copy expands this with the real GitHub profile themes: open-source, continuous learning, cloud/containerization, and trekking outside work. No employment claims are invented.

### Stack groups

- **Frontend:** React, Next.js, TypeScript, Tailwind CSS, shadcn/ui, Redux, Zustand
- **Backend:** Node.js, Express, REST APIs, JWT, OAuth 2.0, MongoDB, PostgreSQL
- **AI:** LangChain, LangGraph, RAG, Mistral AI, Gemini embeddings
- **Cloud & DevOps:** AWS, Docker, Vercel, Netlify, Git, Linux

### Projects

1. **Movie-app-web** — Cinematic movie library with 100 curated films, watchlists, ratings, and a noir-inspired interface. Shipped as a responsive web app and Expo Android build.
   - Stack: React 19, TypeScript, Tailwind v4, Supabase, OMDB
   - Links: [Live](https://movie-web9834.netlify.app), [Code](https://github.com/Gopendranath/Movie-app-web)
2. **product-management** — Responsive product dashboard over the DummyJSON API with search, pagination, and CRUD flows in a shadcn/ui interface.
   - Stack: Next.js, TypeScript, Tailwind, shadcn/ui, DummyJSON
   - Links: [Live](https://product-management-seven-pied.vercel.app), [Code](https://github.com/Gopendranath/product-management)
3. **terminal-web-vm** — Browser-based lab that runs Debian Linux and Node.js entirely client-side using CheerpX and WebContainers.
   - Stack: TypeScript, WebAssembly, CheerpX, WebContainers, xterm
   - Links: [Code](https://github.com/Gopendranath/terminal-web-vm)
4. **RAG PDF Chat** — Full-stack RAG application for chatting with PDFs and images, pairing a Next.js interface with LangChain ingestion and vector search.
   - Stack: Next.js, TypeScript, LangChain, Mistral AI, Gemini embeddings
   - Links: [Frontend](https://github.com/Gopendranath/frontend-rag-chat-agent), [Backend](https://github.com/Gopendranath/Rag-pdf-chat-backend)
5. **I-hate-NPM** — Chrome and Firefox extension that rewrites `npm install` commands to pnpm, yarn, or bun.
   - Stack: JavaScript, Chrome Extension, Firefox, npm
   - Links: [Code](https://github.com/Gopendranath/I-hate-NPM)
6. **Walmart_v1** — E-commerce storefront clone with Auth0 authentication and a shadcn/ui interface.
   - Stack: React, TypeScript, Auth0, shadcn/ui, Vercel
   - Links: [Live](https://walmart-clone-v1.vercel.app/), [Code](https://github.com/Gopendranath/Walmart_v1)

Featured on Home: Movie-app-web, terminal-web-vm, RAG PDF Chat.

## 5. Information architecture

| Route | Page | Purpose |
| --- | --- | --- |
| `/` | Home | Introduction, availability, featured work, stack, GitHub snapshot |
| `/projects` | Projects | Six curated projects with links and stack tags |
| `/about` | About | Bio, grouped technical stack, working principles |
| `/contact` | Contact | Email, social links, location, availability, resume placeholder |

The sidebar is the single primary navigation surface on desktop. On mobile it becomes a top bar plus native dialog drawer.

## 6. Visual system

### Direction

Dark technical, restrained, and editorial. Near-black surfaces, thin rules, mono metadata, one acid-lime accent, generous spacing. No glassmorphism, purple gradients, oversized rounded cards, or decorative card nesting.

### Tokens

```css
@theme {
  --font-sans: "Geist Variable", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "Geist Mono Variable", ui-monospace, monospace;

  --color-canvas: #08090a;
  --color-surface: #0e1012;
  --color-elevated: #14171a;
  --color-line: #262b2e;
  --color-ink: #f2f4f3;
  --color-muted: #8a9290;
  --color-accent: #c7f464;
  --color-accent-ink: #0a0b0a;
}
```

- Set `color-scheme: dark` on the root.
- Use semantic Tailwind classes such as `bg-canvas`, `text-muted`, `border-line`, `text-accent`.
- Use arbitrary color values only inside the theme declaration.

### Typography

- **Geist Sans Variable** for body and display.
- **Geist Mono Variable** for eyebrow labels, numbers, tags, and metadata.
- Self-host both through `@fontsource-variable/geist` and `@fontsource-variable/geist-mono`; import latin subset CSS in `main.tsx`.
- Headline scale: `clamp(2.5rem, 7vw, 5.5rem)` for the home name; tighter tracking, line-height near 0.95.
- Body copy: 16–18px, comfortable measure capped around 65ch.

### Shape and motion

- 2px corner radius for controls and cards; hairline 1px borders.
- Subtle dot-grid or rule texture in the main canvas, implemented with CSS only.
- Page enter: 180–240ms opacity plus 8px rise via a route-keyed wrapper.
- Nav and link hover transitions: 140–180ms ease-out.
- All animation disabled under `prefers-reduced-motion: reduce`.

## 7. Layout

### Desktop

- Fixed sidebar: 280px wide, full viewport height, right border.
- Main content offset by 280px from `lg` (1024px) upward.
- Page container: max-width 1120px, horizontal padding 48px.
- Sidebar contents: monogram/identity, numbered nav, availability status, social links, resume placeholder.
- Active route: accent left rule and accent text.

### Mobile

- Sticky 64px top bar with compact identity and menu button.
- Navigation opens a native `<dialog>` drawer from the left, width `min(88vw, 340px)`.
- Modal behavior comes from `showModal()`: focus containment, Escape close, inert background, top-layer backdrop.
- Drawer closes on navigation and backdrop click.
- Content padding: 20px, section spacing reduced.

## 8. Technical architecture

### Dependencies

Install latest compatible versions:

- `@tanstack/react-router` `1.170.46`
- `@tanstack/router-plugin` `1.168.48` (requires router `^1.170.46`)
- `@tanstack/react-query` `5.106.1`
- `@tanstack/react-router-devtools` and `@tanstack/react-query-devtools`
- `@fontsource-variable/geist` and `@fontsource-variable/geist-mono`

### File structure

```text
src/
  components/
    layout/
      app-sidebar.tsx
      mobile-nav.tsx
      root-layout.tsx
      sidebar-context.tsx
      skip-link.tsx
    home/
      github-snapshot.tsx
    projects/
      project-card.tsx
    ui/
      external-link.tsx
      icons.tsx
      page-header.tsx
      section-label.tsx
      status-badge.tsx
  data/
    navigation.ts
    profile.ts
    projects.ts
  lib/
    github.ts
    query-client.ts
  routes/
    __root.tsx
    index.tsx
    projects.tsx
    about.tsx
    contact.tsx
  main.tsx
  index.css
  routeTree.gen.ts      # generated; never edited manually
```

### Router

- Add `tanstackRouter({ target: 'react', autoCodeSplitting: true })` to Vite **before** the React plugin.
- Keep Tailwind's Vite plugin in the config.
- Create the router in `main.tsx` with:

```ts
const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  scrollRestoration: true,
  Wrap: ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  ),
});
```

- Register the router type through module augmentation:

```ts
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
```

- `__root.tsx` uses `createRootRouteWithContext<{ queryClient: QueryClient }>()`.
- Route-level `head` metadata for title and description; render `<HeadContent />` and `<Scripts />` in the root layout. Remove the static `<title>` from `index.html`.
- Root route provides `errorComponent` and `notFoundComponent`.
- Generated `routeTree.gen.ts` is excluded from linting and marked read-only in `.vscode/settings.json`.

### Query

- One QueryClient created in `lib/query-client.ts`:

```ts
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

- QueryClient is injected into Router context and exposed to React through the Router `Wrap` option. No second client, no duplicate provider tree.
- Devtools render only when `import.meta.env.DEV`.
- GitHub snapshot uses `queryOptions()` in `lib/github.ts`:

```ts
export const githubSnapshotQuery = queryOptions({
  queryKey: ["github", "snapshot", "Gopendranath"],
  queryFn: fetchGithubSnapshot,
  staleTime: 30 * 60_000,
  retry: 1,
});
```

- Fetch `https://api.github.com/users/Gopendranath` and `https://api.github.com/users/Gopendranath/repos?per_page=100&type=owner`.
- Derive `publicRepos`, `followers`, and `totalStars` from original repositories.
- Static fallback snapshot from 2026-11-06: 75 public repos, 12 followers, 29 stars. This keeps the UI useful under rate limits or offline.
- GitHub stats are non-critical, so use component-level `useQuery` with `placeholderData`, not a route loader. Future remote project data should use route loaders with `queryClient.ensureQueryData()`.

### React Context

- `SidebarProvider` lives inside the root layout and owns mobile drawer state.
- Exposes `isOpen`, `open`, `close`, and `toggle`.
- Closes on pathname change and on nav selection.
- `MobileNav` synchronizes state with the native dialog element.
- Static profile/project data stays as typed module imports; do not wrap it in Context.

### Data model

```ts
type SocialId = "github" | "linkedin" | "x" | "website" | "email";

interface SocialLink {
  id: SocialId;
  label: string;
  href: string;
}

interface StackGroup {
  title: string;
  items: readonly string[];
}

interface ProjectLink {
  label: string;
  href: string;
}

interface Project {
  slug: string;
  title: string;
  year: string;
  summary: string;
  stack: readonly string[];
  links: readonly ProjectLink[];
  featured?: boolean;
}
```

Navigation items are a typed const array of `{ label, to, index }`, consumed by both desktop and mobile navigation so labels and order never diverge.

### Components

- `RootLayout` — skip link, sidebar, top bar, route-keyed `<main>` wrapper, `<Outlet />`, devtools.
- `AppSidebar` — identity, nav, status, socials, resume placeholder.
- `MobileNav` — top bar trigger and native dialog drawer.
- `ProjectCard` — numbered card with title, summary, stack tags, links.
- `PageHeader` — eyebrow, title, optional description.
- `SectionLabel` — mono section heading with rule.
- `GithubSnapshot` — three stat blocks with query data or fallback.
- `StatusBadge` — availability indicator.
- Icons are inline SVG components; no icon dependency.

## 9. Page specifications

### Home

- Eyebrow: `FULL STACK DEVELOPER · BENGALURU, IN`
- Large name headline, short bio, primary “View projects” link, secondary “Email me”.
- Availability badge: “Open to work”.
- Selected work: three featured project cards.
- Stack strip: core frontend/backend/AI technologies.
- GitHub snapshot: public repos, followers, total stars; subtle “Live from GitHub” label.
- Footer with copyright and social links.

### Projects

- Page header: “Selected work” plus a short line about shipping end-to-end.
- Two-column grid on desktop, one column on mobile.
- Six project cards in curated order.
- Cards expose only real links; no disabled or fake links.
- Cards use semantic `<article>` and external link labels.

### About

- Page header: "About".
- Portrait: local optimized GitHub avatar (`public/avatar.jpg`), 1:1 crop, with explicit dimensions.
- Bio paragraphs based on real profile information.
- Stack matrix grouped by discipline.
- Three working principles: ship end to end, keep interfaces simple, learn in public.
- Note on open-source, cloud/containerization, and trekking.
- No timeline of unverified employers.

### Contact

- Page header: “Let’s build something.”
- Large `mailto:` email link.
- Social links: GitHub, LinkedIn, X, website.
- Location: BTM Layout, Bengaluru, India · IST.
- Availability badge: “Open to full-stack roles”.
- Resume placeholder: visually disabled button labeled “Resume — coming soon”, with `aria-disabled="true"`. No broken URL.

## 10. Accessibility

- Skip link to `#main-content` as the first focusable element.
- Landmarks: `<nav aria-label="Primary">`, `<main>`, `<footer>`.
- Active links set `aria-current="page"`.
- Visible `focus-visible` ring using the accent color with offset.
- Mobile drawer uses native `<dialog>` semantics and an accessible close button.
- External links use `rel="noreferrer noopener"` and announce that they open in a new tab where useful.
- Text and interactive colors meet WCAG AA against their surfaces.
- Reduced-motion support for all transitions and page entry.

## 11. Performance and SEO

- File-based route auto code splitting enabled.
- Intent-based preloading for navigation.
- Self-hosted variable fonts; load only required families/subsets.
- Local avatar asset with explicit dimensions and lazy decoding outside the first viewport.
- No animation or icon libraries.
- Route `head` provides unique title/description per page, Open Graph title/description, and theme color.
- Static fallback content remains meaningful if the GitHub request fails.

## 12. Error handling

- Root `notFoundComponent` with a clear “Page not found” message and home link.
- Root `errorComponent` with a retry action using the router reset function.
- GitHub query failure silently falls back to the static snapshot; no blocking error screen.
- External links are normal anchors; no client-side fetch failures affect page rendering.

## 13. Maintenance rules

- All copy lives in `src/data` or the relevant page, not duplicated across components.
- All navigation entries come from one typed array.
- No `any`, no non-null assertions except the React root element.
- No raw hex values in components; use theme tokens.
- Route files contain page composition, not reusable primitives.
- Components stay focused; split when a file mixes layout, data access, and presentation.
- Generated route tree is never edited.
- `pnpm lint` and `pnpm build` must pass before completion.

## 14. Verification

- `pnpm lint`
- `pnpm build`
- Dev-server smoke test at `/`, `/projects`, `/about`, `/contact`.
- Browser QA at 1440px, 1024px, and 390px widths.
- Keyboard test: skip link, nav focus order, drawer open/close, Escape, focus return.
- Confirm active nav state on every route.
- Confirm GitHub snapshot renders live data and fallback data.
- Confirm no broken links and no console errors.

## 15. Acceptance criteria

- Starter page and styles are gone.
- Four routes render inside the shared sidebar shell.
- TanStack Router route tree is generated and type-safe.
- TanStack Query is configured once and used by the GitHub snapshot.
- Desktop sidebar and mobile dialog drawer are functional and accessible.
- Visual system matches the dark technical direction.
- All content is real or explicitly placeholder.
- Lint and production build pass.
