# Virtual page sections with `@tanstack/react-virtual`

## Intent

Keep scrolling on the content pages at a steady 60fps by not keeping off-screen
sections mounted: fewer DOM nodes, fewer style/layout/paint targets, and heavy
sub-trees (WebGL canvases, animated cards, tooltips) stop existing once they
scroll well out of view.

Requested surface: the main page sections of `/projects`, `/about`, and `/more`.

## Reality check (recorded so the tradeoff is explicit)

- Page data is small (6 projects, 38 stack chips, 5 feature cards). Windowing
  these lists saves little; the win is architectural (flat cost as content
  grows), not a large measured FPS gain today.
- Real per-frame cost in this app comes from the particle canvas, cursor spring,
  and blur layers, which are per-frame work, not DOM count. Virtualization does
  not touch those. A separate profiling pass would be needed if scrolling still
  drops frames after this ships.

## Goals

- One reusable primitive for window-scrolled, measured section virtualization.
- Sections below the first screen mount on demand, unmount when far out of view.
- Zero layout shift after the first measurement settles; no overlap, no gaps.
- No scroll jumps when scrolling up (measurement corrections handled by the
  library, not hand-rolled math).
- Works with the router's scroll restoration and the existing page enter
  animation.

## Non-goals

- Virtualizing `/` (hero holds the LCP text + particle canvas) or `/chat` (its
  message log is a separate, later concern).
- Changing data files, routing, or visual design.
- Reworking the particle/cursor/theme systems.

## Constraints

- Document scrolling, not an inner scroll container: the sidebar offset, mobile
  dock, scroll blur, skip link, and keyboard scrolling all assume window scroll.
  `useVirtualizer` with an `overflow: auto` wrapper is therefore rejected — it
  would break docking, blur, and `scrollRestoration`.
- Client-only SPA (no SSR), `StrictMode` on.
- jsdom has no `ResizeObserver` and no layout, so tests and any non-measuring
  environment must render the plain stacked sections.
- Interactive/stateful blocks (`AppearanceControls` on `/more`) must not be
  unmounted by scrolling: remounting resets the user's in-progress control state.

## Approaches considered

1. **Window virtualizer over page sections** (`useWindowVirtualizer` +
   `scrollMargin` + `measureElement`). Keeps document scroll, measures real
   heights, uses the library's correction logic. Chosen.
2. **Inner scroll container** (`useVirtualizer` + `overflow-y-auto`). Simpler
   math, but breaks mobile dock safe-area padding, `ScrollBlur`, skip-link focus
   scrolling, and router scroll restoration. Rejected.
3. **Item-level windowing only** (just the card grids). Keeps section chrome but
   leaves heavy sections mounted and still needs the same measurement plumbing.
   Rejected as the primary approach; can be layered later.

## Design

### New primitive

`src/components/ui/virtual-section-list.tsx`

```tsx
export interface VirtualSection {
  id: string
  /** Estimated rendered height. Corrected by measurement on mount. */
  estimate: number
  content: ReactNode
}

export function VirtualSectionList({
  sections,
  className,
}: {
  sections: readonly VirtualSection[]
  className?: string
})
```

Behaviour:

- `useWindowVirtualizer({ count, estimateSize, getItemKey, scrollMargin,
  overscan: 2, useFlushSync: false })`. `useFlushSync: false` avoids the React 19
  `flushSync during render` console warning and lets React batch scroll updates.
- `scrollMargin` = distance from document top to the list, measured with
  `getBoundingClientRect().top + window.scrollY` in a layout effect and
  re-measured on window resize and on `ResizeObserver` of `document.body`, so a
  header that changes height (font swap, scramble animation) cannot leave the
  offset stale.
- Items are absolutely positioned with `transform: translateY(start -
  scrollMargin)` inside a spacer of `getTotalSize()`; each item carries
  `data-index` and `ref={virtualizer.measureElement}`.
- Fallback: when `ResizeObserver` is unavailable, the list container has zero
  width, or `window.matchMedia('print')` matches, render the sections in normal
  document flow with no spacer and no positioning. Same markup path, so tests
  and print keep full content.
- `directDomUpdates` is evaluated during implementation: if the installed
  version supports it with `useWindowVirtualizer`, enable it so scroll frames
  write transforms without a React re-render; if it misbehaves, keep the default
  render path. Either way behaviour is identical, only render count differs.

### Page composition

Sections declared as data at the top of each route file, so the ordered list is
readable and estimates live next to the content they describe.

- `/projects`: header + count row static; virtualize `[grid, github note]`.
- `/about`: header + intro grid (portrait canvas, keeps LCP and avoids GL context
  churn) static; virtualize `[Stack, How I work, resume note]`.
- `/more`: header + "About this site" + `AppearanceControls` static (stateful);
  virtualize `[Features]` before it and `[SSH access, Colophon]` after as two
  lists — the page reads the same, only the controls block stays mounted.

Estimates are seeded from live measurement in the browser during verification and
stored on each section, so the first paint lands close.

### Files

- add `@tanstack/react-virtual@3.14.26` (peer range covers React 19)
- new `src/components/ui/virtual-section-list.tsx`
- edit `src/routes/projects.tsx`, `src/routes/about.tsx`, `src/routes/more.tsx`
- remove the now-redundant `content-auto` / `contain-intrinsic-size` hints on
  virtualized grids

## Verification

- `pnpm lint`, `pnpm check`, `pnpm typecheck`, `pnpm test:unit`, `react-doctor`.
- Browser (agent-browser, port 5173): for each page at 1440×900 and 390×844 —
  compare `document.body.scrollHeight` against the pre-virtualization build,
  scroll bottom → top in steps checking for gaps/overlaps at each stop, confirm
  section boxes tile exactly (`next.top === prev.bottom`), confirm no scroll jump
  on upward scroll, and confirm the first screen renders identically.
- Confirm `/more` keeps `AppearanceControls` state while scrolling past it.

## Known tradeoffs

- Browser find-in-page and text-selection-over-the-whole-page only see mounted
  sections; Ctrl+F can miss deeply scrolled content.
- Total scroll height is an estimate until every section has been measured once;
  a long scroll to an unseen region can settle by a few pixels.
- Section components with local state (none remain inside virtualized regions
  after this design) would lose state on unmount.
