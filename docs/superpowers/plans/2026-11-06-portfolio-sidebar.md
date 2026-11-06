# Portfolio Sidebar Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Vite starter with a dark technical portfolio using a persistent sidebar, file-based TanStack Router, and TanStack Query.

**Architecture:** File-based routes render inside one root layout. TanStack Router context carries a single QueryClient, exposed to React through the Router `Wrap` option. Static profile/project data are typed modules; GitHub stats use one cached query with a static fallback. Sidebar drawer state uses a small React Context.

**Tech Stack:** React 19, TypeScript, Vite 8, Tailwind CSS 4, TanStack Router 1.170, TanStack Query 5.106, Vitest 5, Testing Library, Fontsource Geist.

**Spec:** `docs/superpowers/specs/2026-11-06-portfolio-sidebar-design.md`

## Global Constraints

- Keep `type: "module"`, React 19, Vite 8, and React Compiler.
- Use `pnpm` for every dependency and script.
- TanStack Router plugin must run before the React plugin.
- Use file-based routes in `src/routes`; never edit `src/routeTree.gen.ts`.
- One QueryClient. No duplicate provider trees.
- No `any`; no non-null assertions except `document.getElementById("root")`.
- No raw hex values in components; colors come from `@theme` tokens.
- No fabricated employment history, testimonials, or client claims.
- Resume is a disabled placeholder; no broken URL.
- GitHub fallback values: **75 public repos, 12 followers, 29 stars**.
- All external links use `target="_blank"` and `rel="noreferrer noopener"`.
- `pnpm lint`, `pnpm test`, and `pnpm build` must pass.
- Commit after every task. Use Conventional Commits.

## Review Focus

- GitHub API failure or rate limiting: the Home snapshot must show fallback values and never crash.
- Mobile drawer behavior: open, Escape close, backdrop close, focus return, and close on navigation.
- Deep links and unknown routes: direct `/projects` loads correctly; unknown paths show the not-found screen.
- Narrow viewports: long project titles, stack tags, email, and nav labels must not overflow at 390px.
- Link safety: project, social, and resume states must never produce a 404 or unsafe new-tab link.

---

### Task 1: Dependencies, test harness, and typed content data

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/data/types.ts`
- Create: `src/data/profile.ts`
- Create: `src/data/navigation.ts`
- Create: `src/data/projects.ts`
- Test: `src/data/data.test.ts`

**Interfaces:**
- Produces: `Profile`, `SocialLink`, `StackGroup`, `Project`, `ProjectLink`, `NavItem` types.
- Produces: `profile: Profile`, `navItems: readonly NavItem[]`, `projects: readonly Project[]`.

- [ ] **Step 1: Install runtime and test dependencies**

Run:

```bash
pnpm add @tanstack/react-router@1.170.46 @tanstack/react-query@5.106.1 @fontsource-variable/geist@5.3.0 @fontsource-variable/geist-mono@5.3.0
pnpm add -D @tanstack/router-plugin@1.168.48 @tanstack/react-router-devtools@1.167.2 @tanstack/react-query-devtools@5.106.1 vitest@5.1.0 jsdom@31.0.0 @testing-library/react@16.3.3 @testing-library/dom@10.4.2 @testing-library/user-event@14.6.8 @testing-library/jest-dom@7.0.1
```

- [ ] **Step 2: Add scripts and Vitest configuration**

Add to `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

Create `vitest.config.ts` with `defineConfig` from `vitest/config`, the React plugin, `environment: "jsdom"`, `setupFiles: ["./src/test/setup.ts"]`, `restoreMocks: true`, and `css: false`.

Create `src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(cleanup);

if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}
```

- [ ] **Step 3: Write the failing data tests**

Create `src/data/data.test.ts` with assertions that:

```ts
expect(profile.email).toBe("gopendranathsasmal7@gmail.com");
expect(profile.availability).toBe("Open to work");
expect(profile.socials.map((social) => social.id)).toEqual([
  "github", "linkedin", "x", "website", "email",
]);
expect(navItems.map((item) => item.label)).toEqual([
  "Home", "Projects", "About", "Contact",
]);
expect(projects).toHaveLength(6);
expect(projects.filter((project) => project.featured)).toHaveLength(3);
expect(new Set(projects.map((project) => project.slug)).size).toBe(projects.length);
expect(projects.every((project) =>
  project.links.length > 0 &&
  project.links.every((link) => link.href.startsWith("https://"))
)).toBe(true);
expect(profile.resumeAvailable).toBe(false);
```

- [ ] **Step 4: Run the data tests to verify they fail**

Run: `pnpm test src/data/data.test.ts`
Expected: FAIL because `src/data/*` modules do not exist.

- [ ] **Step 5: Implement the typed content data**

Create the types from the spec. `Profile` includes `name`, `firstName`, `role`, `location`, `timezone`, `email`, `availability`, `bio`, `about: readonly string[]`, `socials`, `stack`, and `resumeAvailable: boolean`.

Populate the six projects exactly as specified, with featured flags on `Movie-app-web`, `terminal-web-vm`, and RAG PDF Chat. Navigation entries use `01`–`04` indices and typed `to` values `"/" | "/projects" | "/about" | "/contact"`.

- [ ] **Step 6: Run the data tests to verify they pass**

Run: `pnpm test src/data/data.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts src/test src/data
git commit -m "feat: add typed portfolio content and test harness"
```

---

### Task 2: GitHub snapshot query and fallback

**Files:**
- Create: `src/lib/github.ts`
- Test: `src/lib/github.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `GithubSnapshot`, `GITHUB_FALLBACK`, `toGithubSnapshot(user, repos)`, `fetchGithubSnapshot(signal?)`, `githubSnapshotQuery`.

- [ ] **Step 1: Write the failing query tests**

Create `src/lib/github.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { GITHUB_FALLBACK, toGithubSnapshot } from "./github";

describe("toGithubSnapshot", () => {
  it("uses profile counts and sums stars from original repos only", () => {
    const snapshot = toGithubSnapshot(
      { public_repos: 7, followers: 3 },
      [
        { fork: false, stargazers_count: 4 },
        { fork: false, stargazers_count: 2 },
        { fork: true, stargazers_count: 99 },
      ],
    );
    expect(snapshot).toEqual({ publicRepos: 7, followers: 3, totalStars: 6 });
  });
});

describe("GITHUB_FALLBACK", () => {
  it("matches the verified 2026-11-06 snapshot", () => {
    expect(GITHUB_FALLBACK).toEqual({
      publicRepos: 75,
      followers: 12,
      totalStars: 29,
    });
  });
});
```

- [ ] **Step 2: Run the query tests to verify they fail**

Run: `pnpm test src/lib/github.test.ts`
Expected: FAIL because `src/lib/github.ts` does not exist.

- [ ] **Step 3: Implement the query module**

Use `queryOptions` from `@tanstack/react-query`. Define the exported `GithubSnapshot` interface, `GITHUB_FALLBACK`, and `toGithubSnapshot(user, repos)`.

`fetchGithubSnapshot(signal?: AbortSignal)` fetches:

```text
https://api.github.com/users/Gopendranath
https://api.github.com/users/Gopendranath/repos?per_page=100&type=owner
```

Throw on a non-OK response, derive the snapshot with `toGithubSnapshot`, and pass `signal` to both requests.

`githubSnapshotQuery` uses query key `["github", "snapshot", "Gopendranath"]`, `staleTime: 30 * 60_000`, `retry: 1`, and `placeholderData: GITHUB_FALLBACK`.

- [ ] **Step 4: Run the query tests to verify they pass**

Run: `pnpm test src/lib/github.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/github.ts src/lib/github.test.ts
git commit -m "feat: add cached GitHub snapshot query"
```

---

### Task 3: QueryClient, router foundation, and route skeleton

**Files:**
- Modify: `vite.config.ts`
- Create: `src/lib/query-client.ts`
- Create: `src/lib/query-client.test.ts`
- Replace: `src/main.tsx`
- Create: `src/routes/__root.tsx`
- Create: `src/routes/index.tsx`
- Create: `src/routes/projects.tsx`
- Create: `src/routes/about.tsx`
- Create: `src/routes/contact.tsx`
- Create: `src/components/devtools.tsx`
- Modify: `index.html`
- Delete: `src/App.tsx`, `src/App.css`, `src/assets/`

**Interfaces:**
- Consumes: `profile`, `navItems`, `projects`, `githubSnapshotQuery`.
- Produces: `queryClient`, generated `routeTree`, root `RouterContext` type, `router` type registration.

- [ ] **Step 1: Write the failing QueryClient test**

Create `src/lib/query-client.test.ts`:

```ts
import { expect, it } from "vitest";
import { queryClient } from "./query-client";

it("uses the portfolio cache defaults", () => {
  const queries = queryClient.getDefaultOptions().queries;
  expect(queries?.staleTime).toBe(5 * 60_000);
  expect(queries?.gcTime).toBe(30 * 60_000);
  expect(queries?.refetchOnWindowFocus).toBe(false);
  expect(queries?.retry).toBe(1);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test src/lib/query-client.test.ts`
Expected: FAIL because `src/lib/query-client.ts` does not exist.

- [ ] **Step 3: Implement QueryClient and Router foundation**

Create the single QueryClient with the spec defaults.

Update `vite.config.ts` plugins in this order:

```ts
tailwindcss(),
tanstackRouter({ target: "react", autoCodeSplitting: true }),
react(),
babel({ presets: [reactCompilerPreset()] }),
```

Replace `src/main.tsx` with:

```tsx
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { queryClient } from "./lib/query-client";
import { routeTree } from "./routeTree.gen";
import "./index.css";

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

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
```

Create minimal route files so the generated tree has `/`, `/projects`, `/about`, and `/contact`. Root layout may temporarily render `<Outlet />`; Task 4 replaces it with the real shell.

Add root `head` metadata and `<HeadContent />` / `<Scripts />`. Remove the static `<title>` from `index.html` and add `<meta name="theme-color" content="#08090a" />`.

Create `src/components/devtools.tsx` with dynamic, development-only imports of `TanStackRouterDevtools` and `ReactQueryDevtools`; render nothing in production.

Delete `src/App.tsx`, `src/App.css`, and `src/assets/`.

- [ ] **Step 4: Run the QueryClient test and production build**

Run: `pnpm test src/lib/query-client.test.ts`
Expected: PASS.

Run: `pnpm build`
Expected: PASS and `src/routeTree.gen.ts` is generated.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: configure TanStack Router and Query"
```

---

### Task 4: Design tokens, root layout, sidebar, and mobile dialog

**Files:**
- Replace: `src/index.css`
- Modify: `src/routes/__root.tsx`
- Create: `src/components/layout/root-layout.tsx`
- Create: `src/components/layout/sidebar-context.tsx`
- Create: `src/components/layout/sidebar-context.test.tsx`
- Create: `src/components/layout/sidebar-route-sync.tsx`
- Create: `src/components/layout/app-sidebar.tsx`
- Create: `src/components/layout/mobile-nav.tsx`
- Create: `src/components/layout/skip-link.tsx`
- Create: `src/components/ui/status-badge.tsx`
- Create: `src/components/ui/section-label.tsx`
- Create: `src/components/ui/page-header.tsx`
- Create: `src/components/ui/external-link.tsx`
- Create: `src/components/ui/icons.tsx`

**Interfaces:**
- Consumes: `profile`, `navItems`, Router `Link`.
- Produces: `SidebarProvider`, `useSidebar(): SidebarContextValue`, `RootLayout`, `AppSidebar`, `MobileNav`, `PageHeader`, `SectionLabel`, `StatusBadge`, `ExternalLink`.

- [ ] **Step 1: Write the failing sidebar context test**

Create `src/components/layout/sidebar-context.test.tsx`:

```tsx
import { act, renderHook } from "@testing-library/react";
import { expect, it } from "vitest";
import { SidebarProvider, useSidebar } from "./sidebar-context";

it("opens, toggles, and closes the drawer", () => {
  const { result } = renderHook(() => useSidebar(), {
    wrapper: SidebarProvider,
  });

  expect(result.current.isOpen).toBe(false);
  act(() => result.current.open());
  expect(result.current.isOpen).toBe(true);
  act(() => result.current.toggle());
  expect(result.current.isOpen).toBe(false);
  act(() => result.current.open());
  act(() => result.current.close());
  expect(result.current.isOpen).toBe(false);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test src/components/layout/sidebar-context.test.tsx`
Expected: FAIL because the provider does not exist.

- [ ] **Step 3: Implement the design tokens and layout**

Replace `src/index.css` with `@import "tailwindcss";`, the exact `@theme` tokens from the spec, and base styles: dark color scheme, canvas background with subtle dot grid, Geist body font, selection color, focus-visible ring, and reduced-motion overrides. Do not leave starter CSS.

Implement `SidebarProvider` with `isOpen`, `open`, `close`, and `toggle`; functions must be stable with `useCallback`.

Implement `RootLayout` with skip link, desktop sidebar, mobile top bar/drawer, route-keyed `<main id="main-content" tabIndex={-1}>`, shared footer, `<Outlet />`, and devtools.

Implement `AppSidebar` with identity, numbered typed nav links, active state via the `Link` children `isActive` flag plus `aria-current="page"`, availability, socials, and a disabled resume button.

Implement `MobileNav` with a sticky top bar and native `<dialog>`. Sync `isOpen` with `showModal()` / `close()`, close on backdrop click, and provide an accessible close button. Lock body scroll while the dialog is open with `body:has(dialog[open])`. `SidebarRouteSync` closes the drawer on pathname changes.

Use inline SVG icons from `src/components/ui/icons.tsx`; no icon package.

- [ ] **Step 4: Run tests and build**

Run: `pnpm test src/components/layout/sidebar-context.test.tsx`
Expected: PASS.

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/components src/routes/__root.tsx
git commit -m "feat: add sidebar shell and dark design system"
```

---

### Task 5: Home page, project card, and GitHub snapshot UI

**Files:**
- Modify: `src/routes/index.tsx`
- Create: `src/components/projects/project-card.tsx`
- Create: `src/components/projects/project-card.test.tsx`
- Create: `src/components/home/github-snapshot.tsx`
- Create: `src/components/home/github-snapshot.test.tsx`

**Interfaces:**
- Consumes: `projects`, `profile`, `githubSnapshotQuery`, `GITHUB_FALLBACK`.
- Produces: `ProjectCard({ project, index })`, `GithubSnapshot()`.

- [ ] **Step 1: Write the failing component tests**

`project-card.test.tsx`: render `ProjectCard` with a fixture; assert the title, summary, stack labels, and every anchor has `target="_blank"` and `rel` containing `noreferrer` and `noopener`.

`github-snapshot.test.tsx`: create a `QueryClient` with `retry: false`; stub `fetch` to reject; wrap `GithubSnapshot` in `QueryClientProvider`; assert the fallback values `75`, `12`, and `29` render.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm test src/components/projects/project-card.test.tsx src/components/home/github-snapshot.test.tsx`
Expected: FAIL because the components do not exist.

- [ ] **Step 3: Implement Home and components**

`ProjectCard` renders a semantic `<article>` with index, year, title, summary, stack chips, and external links. It handles long titles with `break-words`.

`GithubSnapshot` calls `useQuery(githubSnapshotQuery)`, renders public repos, followers, and total stars, and shows a subtle live/fallback label without blocking errors.

Home renders the eyebrow, large name, bio, availability, CTAs, three featured projects, stack strip, GitHub snapshot, and footer-adjacent content.

- [ ] **Step 4: Run tests and build**

Run: `pnpm test src/components/projects/project-card.test.tsx src/components/home/github-snapshot.test.tsx`
Expected: PASS.

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/routes/index.tsx src/components/projects src/components/home
git commit -m "feat: build home page and GitHub snapshot"
```

---

### Task 6: Projects page

**Files:**
- Modify: `src/routes/projects.tsx`

**Interfaces:**
- Consumes: `projects`, `ProjectCard`, `PageHeader`, `SectionLabel`.
- Produces: complete `/projects` page.

- [ ] **Step 1: Implement the Projects page**

Render a page header (“Selected work”) and a responsive two-column grid of all six projects using `ProjectCard`. Keep the curated order. Use one column below `md`. Add the page-level `head` title and description.

- [ ] **Step 2: Verify the page and build**

Run: `pnpm build`
Expected: PASS.

Run: `pnpm dev`, open `/projects`, and confirm all six cards and links render without overflow at 390px.

- [ ] **Step 3: Commit**

```bash
git add src/routes/projects.tsx
git commit -m "feat: add projects page"
```

---

### Task 7: About, Contact, avatar, and resume placeholder

**Files:**
- Modify: `src/routes/about.tsx`
- Modify: `src/routes/contact.tsx`
- Create: `public/avatar.jpg`

**Interfaces:**
- Consumes: `profile`, `StackGroup`, `SectionLabel`, `StatusBadge`, `ExternalLink`.
- Produces: complete `/about` and `/contact` pages.

- [ ] **Step 1: Add the local avatar**

Download the authenticated GitHub avatar to `public/avatar.jpg` with `gh api users/Gopendranath --jq .avatar_url` followed by `Invoke-WebRequest`. Confirm the file is a valid JPEG.

- [ ] **Step 2: Implement About**

Render the portrait with explicit `width` and `height`, bio paragraphs, grouped stack matrix, three principles, and the open-source/trekking note. Add the page-level `head` metadata.

- [ ] **Step 3: Implement Contact**

Render the large `mailto:` email link, GitHub/LinkedIn/X/website links, location and IST, availability badge, and a disabled “Resume — coming soon” button. No anchor to a missing PDF. Add the page-level `head` metadata.

- [ ] **Step 4: Verify and commit**

Run: `pnpm build`
Expected: PASS.

Run: `pnpm dev`; confirm `/about` and `/contact` render at desktop and mobile widths, and the resume button is disabled and not focusable.

```bash
git add src/routes/about.tsx src/routes/contact.tsx public/avatar.jpg
git commit -m "feat: add about and contact pages"
```

---

### Task 8: Metadata, fallbacks, assets, README, and final QA

**Files:**
- Modify: `index.html`
- Modify: `src/routes/__root.tsx`
- Replace: `public/favicon.svg`
- Delete: `public/icons.svg`
- Create: `.vscode/settings.json`
- Modify: `.oxlintrc.json`
- Replace: `README.md`

**Interfaces:**
- Consumes: all previous tasks.
- Produces: production-ready site and project documentation.

- [ ] **Step 1: Finish route metadata and error states**

Confirm every route has a unique title and description. Root `notFoundComponent` renders a clear message and a typed home link. Root `errorComponent` renders an error message and a working retry action. Confirm `<HeadContent />` and `<Scripts />` are rendered exactly once.

- [ ] **Step 2: Replace starter assets and docs**

Replace `public/favicon.svg` with a dark square and lime “GS” monogram. Delete `public/icons.svg`. Update `README.md` with setup, scripts, architecture, data editing, and the note that static hosts need an SPA fallback rewrite for deep links.

Create `.vscode/settings.json` marking `**/routeTree.gen.ts` read-only and excluded from search/watch. Add `"ignorePatterns": ["src/routeTree.gen.ts"]` to `.oxlintrc.json`.

- [ ] **Step 3: Run the full verification suite**

Run:

```bash
pnpm lint
pnpm test
pnpm build
```

Expected: all three PASS.

- [ ] **Step 4: Browser QA**

Run `pnpm dev` and verify:

- `/`, `/projects`, `/about`, `/contact` at 1440px, 1024px, and 390px.
- Sidebar active state on every route.
- Mobile drawer opens, closes on Escape, closes on backdrop, returns focus, and closes after navigation.
- Skip link is first in tab order and focuses `#main-content`.
- Unknown path shows the not-found screen.
- GitHub snapshot shows live values or the fallback without console errors.
- No horizontal overflow, broken links, or missing images.

Fix any issues before committing.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: polish metadata, assets, and documentation"
```

---

## Plan Self-Review

- **Spec coverage:** identity/content (Task 1), GitHub query (Tasks 2, 5), Router/Query integration (Task 3), visual system/sidebar (Task 4), Home (Task 5), Projects (Task 6), About/Contact/resume (Task 7), metadata/errors/assets/verification (Task 8).
- **Type consistency:** `GithubSnapshot` uses `publicRepos`, `followers`, `totalStars`; `Project` uses `slug`, `title`, `year`, `summary`, `stack`, `links`, `featured`; `SidebarContextValue` uses `isOpen`, `open`, `close`, `toggle`.
- **Review focus tests:** GitHub fallback is covered in Tasks 2 and 5; unsafe external links are covered in Task 5; data integrity is covered in Task 1; drawer, overflow, deep-link, and resume states are covered by Task 8 browser QA.
- **Scope:** one independently shippable site, no subsystem split needed.
