# Mobile Floating Bottom Dock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the small-screen drawer with a floating six-destination bottom dock while keeping the desktop sidebar and compact mobile header.

**Architecture:** A new `MobileDock` renders `navItems` as a fixed floating tab bar. A shared `isNavItemActive` helper keeps desktop and mobile active states aligned. Drawer state, dialog markup, and animation CSS are deleted, and the root layout reserves space for the dock.

**Tech Stack:** React 19, TypeScript, Vite 8, Tailwind CSS 4, TanStack Router 1.170, Vitest 5, Testing Library, Biome.

**Spec:** `docs/superpowers/specs/2026-11-11-mobile-bottom-dock-design.md`

## Global Constraints

- Use `pnpm` for every script.
- Keep React 19, Vite 8, React Compiler, and file-based TanStack Router.
- No new dependencies.
- No `any`.
- No raw hex values in components; use existing theme tokens.
- All six destinations from `src/data/navigation.ts` stay visible; order must not change.
- Dock is hidden at `lg` and above; desktop sidebar is unchanged.
- Minimum touch target is 44px.
- `pnpm check`, `pnpm test`, and `pnpm build` must pass.
- Commit after every task with Conventional Commits.
- Do not edit historical specs or plans from 2026-11-06.

## Review Focus

- 320px viewport: six labels, including "Projects", must not overflow or push the pill past the viewport.
- Chat: the composer must remain fully visible above the dock, including safe-area insets.
- Long routes: `/projects/anything` must mark Projects active, and `/` must only match exactly.
- Keyboard and screen readers: six links reachable in order, active one exposes `aria-current="page"`.
- Reduced motion and theme switching: the dock must not animate or flash when either changes.

---

### Task 1: Shared active-route helper

**Files:**
- Create: `src/lib/navigation.ts`
- Test: `src/lib/__tests__/navigation.test.ts`

**Interfaces:**
- Produces: `isNavItemActive(pathname: string, to: string): boolean`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { isNavItemActive } from '../navigation'

describe('isNavItemActive', () => {
  it('matches the home route exactly', () => {
    expect(isNavItemActive('/', '/')).toBe(true)
    expect(isNavItemActive('/projects', '/')).toBe(false)
  })

  it('matches exact and nested routes', () => {
    expect(isNavItemActive('/projects', '/projects')).toBe(true)
    expect(isNavItemActive('/projects/one', '/projects')).toBe(true)
    expect(isNavItemActive('/about', '/projects')).toBe(false)
  })

  it('does not match a shared prefix', () => {
    expect(isNavItemActive('/projects-archive', '/projects')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/__tests__/navigation.test.ts`
Expected: FAIL because `../navigation` cannot be resolved.

- [ ] **Step 3: Implement `isNavItemActive` in `src/lib/navigation.ts`**

```ts
export function isNavItemActive(pathname: string, to: string): boolean {
  return to === '/'
    ? pathname === '/'
    : pathname === to || pathname.startsWith(`${to}/`)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/__tests__/navigation.test.ts`
Expected: 3 tests pass.

- [ ] **Step 5: Point `PrimaryNav` at the shared helper**

Remove its local `isItemActive` function and import `isNavItemActive` from `../../lib/navigation`.

- [ ] **Step 6: Verify and commit**

Run: `pnpm test`
Expected: all tests pass.

```bash
git add src/lib/navigation.ts src/lib/__tests__/navigation.test.ts src/components/layout/primary-nav.tsx
git commit -m "refactor(nav): share active route helper"
```

---

### Task 2: Dock icons and `MobileDock`

**Files:**
- Modify: `src/components/ui/icons.tsx`
- Create: `src/components/layout/mobile-dock.tsx`
- Test: `src/components/layout/__tests__/mobile-dock.test.tsx`

**Interfaces:**
- Consumes: `isNavItemActive(pathname, to)`, `navItems`, `RoutePath`.
- Produces: `MobileDock(): ReactElement`.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { navItems } from '../../../data/navigation'

const routerState = vi.hoisted(() => ({ pathname: '/' }))

vi.mock('@tanstack/react-router', async () => {
  const { createElement } = await import('react')

  return {
    Link: ({
      to,
      children,
      ...props
    }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
      to: string
      children: React.ReactNode
    }) => createElement('a', { href: to, ...props }, children),
    useRouterState: ({
      select,
    }: {
      select: (state: { location: { pathname: string } }) => string
    }) => select({ location: { pathname: routerState.pathname } }),
  }
})

it('renders every destination and marks the active route', () => {
  routerState.pathname = '/projects'
  render(<MobileDock />)

  const nav = screen.getByRole('navigation', { name: 'Primary' })
  const links = within(nav).getAllByRole('link')

  expect(links).toHaveLength(navItems.length)
  expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute(
    'href',
    '/projects',
  )
  expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute(
    'aria-current',
  )
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/layout/__tests__/mobile-dock.test.tsx`
Expected: FAIL because `../mobile-dock` does not exist.

- [ ] **Step 3: Add inline icons to `src/components/ui/icons.tsx`**

Add five stroke icons next to the existing set: `HomeIcon`, `FolderIcon`, `UserIcon`, `MessageIcon`, `EllipsisIcon`. Each accepts `IconProps`, uses the existing `StrokeIcon` wrapper, and sets `aria-hidden` through the wrapper. Reuse `MailIcon` for Contact.

- [ ] **Step 4: Implement `MobileDock` in `src/components/layout/mobile-dock.tsx`**

Use an exhaustive `Record<RoutePath, ComponentType<SVGProps<SVGSVGElement>>>` icon map. Render:

- Outer `<nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">`.
- Pill `<div className="w-full max-w-[22rem] rounded-2xl border border-line bg-canvas/90 p-1.5 shadow-[0_10px_30px_rgb(0_0_0/0.35)] backdrop-blur-md">`.
- `<ul className="flex items-stretch">`; each `<li className="min-w-0 flex-1">`.
- `Link` with `to`, `className="relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-1.5 transition-colors"`, muted or accent classes, and `aria-current={isActive ? 'page' : undefined}`.
- Active-only decorative bar `<span aria-hidden="true" className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-accent" />`.
- Icon `className="size-[18px]"`, label `className="max-w-full truncate font-mono text-[8px] uppercase tracking-[0.08em]"`.

Use `useRouterState` with `select: (state) => state.location.pathname`.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/components/layout/__tests__/mobile-dock.test.tsx`
Expected: 1 test passes.

- [ ] **Step 6: Verify and commit**

Run: `pnpm check && pnpm test`
Expected: no errors; all tests pass.

```bash
git add src/components/ui/icons.tsx src/components/layout/mobile-dock.tsx src/components/layout/__tests__/mobile-dock.test.tsx
git commit -m "feat(nav): add floating mobile dock"
```

---

### Task 3: Compact header and drawer removal

**Files:**
- Create: `src/components/layout/mobile-header.tsx`
- Delete: `src/components/layout/mobile-nav.tsx`
- Delete: `src/components/layout/sidebar-provider.tsx`
- Delete: `src/components/layout/sidebar-context.ts`
- Delete: `src/components/layout/sidebar-route-sync.tsx`
- Delete: `src/components/layout/__tests__/sidebar-context.test.tsx`
- Modify: `src/components/layout/root-layout.tsx`
- Modify: `src/test/setup.ts`

**Interfaces:**
- Produces: `MobileHeader(): ReactElement`.
- `RootLayout` renders `<MobileHeader />` and `<MobileDock />` without `SidebarProvider`.

- [ ] **Step 1: Create `MobileHeader`**

Move the current sticky header from `mobile-nav.tsx` into `mobile-header.tsx`. Keep the avatar/name link and `lg:hidden sticky top-0 z-30 h-16` shell. Replace the hamburger button with `<ThemeToggle />`. Remove `useSidebar`, dialog refs, effects, imports of `PrimaryNav`, `SocialLinks`, `StatusBadge`, `DownloadIcon`, `CloseIcon`, and `MenuIcon`.

- [ ] **Step 2: Delete drawer files and their test**

Delete the three sidebar files and `sidebar-context.test.tsx`.

- [ ] **Step 3: Rewire `RootLayout`**

Remove `SidebarProvider`, `SidebarRouteSync`, `MobileNav`, and their imports. Wrap the existing page shell in a fragment instead of the provider. Render `<MobileHeader />` and `<MobileDock />` next to `AppSidebar`.

- [ ] **Step 4: Remove the dialog polyfill from `src/test/setup.ts`**

Keep the cleanup hook and jest-dom import; drop the `HTMLDialogElement` block.

- [ ] **Step 5: Verify no references remain**

Run: `rg "SidebarProvider|useSidebar|SidebarRouteSync|MobileNav|sidebar-context" src`
Expected: no output.

Run: `pnpm check && pnpm test`
Expected: no errors; all tests pass.

- [ ] **Step 6: Commit**

```bash
git add -A src/components/layout src/test/setup.ts
git commit -m "refactor(nav): replace mobile drawer with dock header"
```

---

### Task 4: Reserve layout space for the dock

**Files:**
- Modify: `src/index.css`
- Modify: `src/components/layout/root-layout.tsx`

**Interfaces:**
- Produces CSS custom property `--mobile-dock-space` for layout padding.

- [ ] **Step 1: Add the spacing token**

In the `:root` block in `src/index.css`, add:

```css
--mobile-dock-space: calc(5.5rem + env(safe-area-inset-bottom));
```

- [ ] **Step 2: Remove drawer animation CSS**

Delete the `#mobile-navigation` rules, their `@starting-style` blocks, and the backdrop rules at the end of `src/index.css`. Keep the generic `body:has(dialog[open])` scroll lock.

- [ ] **Step 3: Pad normal pages and shorten chat**

In `RootLayout`:

- Non-chat wrapper: add `pb-[var(--mobile-dock-space)] lg:pb-0`.
- Chat wrapper: change the mobile height to `h-[calc(100dvh_-_4rem_-_var(--mobile-dock-space))]`; keep `lg:h-dvh`.

- [ ] **Step 4: Verify**

Run: `pnpm check && pnpm build`
Expected: TypeScript and Vite build pass, and generated CSS contains `--mobile-dock-space`.

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/components/layout/root-layout.tsx
git commit -m "fix(layout): clear the floating dock"
```

---

### Task 5: Copy updates and branch verification

**Files:**
- Modify: `src/routes/more.tsx`
- Modify: `README.md`

**Interfaces:**
- None; user-facing copy only.

- [ ] **Step 1: Update `/more` feature copy**

Change the "Persistent navigation" body to:

> A fixed sidebar on desktop and a floating bottom dock on small screens, with the current route marked.

- [ ] **Step 2: Update README structure line**

Change `layout/ sidebar, mobile drawer, shell, context` to `layout/ sidebar, mobile header and dock, shell`.

- [ ] **Step 3: Run full verification**

Run: `pnpm check && pnpm test && pnpm build`
Expected: formatting/lint clean, all tests pass, production build succeeds.

- [ ] **Step 4: Manual browser check**

Run: `pnpm dev`, then inspect `/`, `/projects`, `/contact`, `/chat`, and `/more` at 320px, 375px, and 768px in dark and light themes. Confirm:

- Six dock links fit without horizontal overflow.
- Active route is accent-coloured with `aria-current`.
- Chat composer sits fully above the dock.
- Keyboard order reaches all six links.
- Desktop sidebar still appears at `lg`.

- [ ] **Step 5: Commit**

```bash
git add src/routes/more.tsx README.md
git commit -m "docs: describe the mobile bottom dock"
```
