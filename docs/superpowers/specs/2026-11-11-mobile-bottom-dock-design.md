# Mobile Floating Bottom Dock — Design Spec

- **Date:** 2026-11-11
- **Status:** Approved
- **Project:** `portfolio-dev-v1`
- **Stack:** React 19, TypeScript, Vite 8, Tailwind CSS 4, TanStack Router

## 1. Purpose

Replace the small-screen left drawer and hamburger trigger with a persistent floating navigation dock at the bottom of the viewport. Desktop keeps the fixed sidebar unchanged.

## 2. Goals

- One floating dock on viewports below `lg`, containing all six destinations.
- Keep the compact mobile header for identity and theme control.
- Remove drawer state, dialog markup, and drawer animation CSS.
- Keep keyboard, screen-reader, and touch behaviour correct.

## 3. Non-goals

- No desktop navigation change.
- No new routes, data, or dependencies.
- No auto-hiding dock on scroll.
- No five-tab overflow pattern; every destination stays visible.

## 4. Approaches considered

1. **All six destinations in one dock (chosen).** Preserves every route, no extra tap. Six tabs is above the usual five-tab guideline and labels must be small, but 296px of usable width at the 320px minimum still fits six 44px targets.
2. **Five tabs plus a More sheet.** Roomier targets, but adds a sheet component and hides Chat behind an extra tap. Rejected.
3. **Keep the drawer and add the dock.** Redundant navigation and two sources of truth. Rejected.

## 5. Design

### Dock

- `fixed inset-x-0 bottom-0`, centred, `lg:hidden`, `z-40`.
- Outer gutter: `padding-inline: 0.75rem`, `padding-bottom: max(0.75rem, env(safe-area-inset-bottom))`.
- Pill: `w-full max-w-[22rem]`, `rounded-2xl`, `border border-line`, `bg-canvas/90`, backdrop blur, soft shadow.
- Six equal tabs from `navItems`, in existing order. Each tab: icon above an `8px` mono uppercase label, `min-height: 48px`, `flex: 1`.
- Active tab: accent icon and label, `bg-accent/10`, plus a 2px accent bar at the top of the tab. `aria-current="page"`.
- Inactive tab: muted, hover/focus to ink. Icons are `aria-hidden`.
- `nav aria-label="Primary"`, matching the desktop navigation landmark.

### Header

- Sticky 64px header below `lg`.
- Left: avatar plus profile name, linking home.
- Right: `ThemeToggle`.
- Hamburger button, `aria-expanded`, `aria-controls`, and the `<dialog>` are removed.

### State and layout

- Delete `SidebarProvider`, `sidebar-context`, `sidebar-route-sync`, their test, and all root-layout wiring.
- Extract the active-route predicate to a shared helper so desktop and dock agree.
- Add `--mobile-dock-space: calc(5.5rem + env(safe-area-inset-bottom))` to `:root`.
- Normal page wrapper gets bottom padding equal to that token below `lg`; reset at `lg`.
- Chat wrapper height becomes `calc(100dvh - 4rem - var(--mobile-dock-space))` below `lg`, so the composer stays above the dock.
- Remove `#mobile-navigation` animation rules and the dialog polyfill from the test setup.

### Content

- Update the `/more` feature copy and README structure line from drawer to bottom dock.
- Leave the historical 2026-11-06 design and plan documents untouched.

## 6. Accessibility

- Real `<nav>` and anchor elements, not a dialog.
- Six targets with at least a 44px hit area.
- Visible focus uses the existing global focus ring.
- Active state exposed through `aria-current`.
- Reduced motion needs no new handling; no new animation is introduced.

## 7. Verification

- `pnpm check`, `pnpm test`, `pnpm build`.
- Manual checks at 320px, 375px, and 768px in dark and light themes.
- Chat composer visible above the dock, including with safe-area insets.
- Keyboard tab order reaches all six dock links.
