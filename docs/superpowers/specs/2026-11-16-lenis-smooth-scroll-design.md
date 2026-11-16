# Lenis smooth scrolling — design

## Intent

Every route feels like one continuous, inertial scroll: wheel input is eased
instead of stepping, and nothing on the page fights it. Requested: "all pages
feel smooth scroll".

## Approach

`lenis@1.3.27` (MIT, zero runtime deps) mounted once in the root layout. Lenis
drives the real window scroll position, so the scrollbar, sticky elements,
`position: fixed` chrome (sidebar, mobile dock, scroll blur), anchor links, and
keyboard scrolling keep working.

Rejected: a transform-based virtual scroller (breaks sticky/fixed chrome,
`scrollIntoView`, and the router's scroll restoration) and per-page instances
(duplicate rAF loops, seams at navigation).

## Design

### Instance

`src/components/layout/smooth-scroll.tsx`, rendered once by `RootLayout`.

```ts
new Lenis({
  autoRaf: true,
  duration: 1.1,
  anchors: true,
  stopInertiaOnNavigate: true,
  syncTouch: false,
})
```

- `syncTouch: false` keeps native momentum on phones — OS touch scrolling is
  already smoother than anything JS can emulate, and `syncTouch` is documented
  as unstable on older iOS.
- `respectReducedMotion` stays at its default `true`: Lenis disables smoothing
  and makes programmatic scrolls instant when the OS asks for reduced motion,
  and picks the setting up live.
- Wheel gestures over elements that own their scroll (`data-lenis-prevent` on
  the chat log, owner inbox, history list, message editor, and the sidebar) are
  left native, so inner lists keep scrolling the way they do today.

### Router and virtualizer interplay

- `html { scroll-behavior: smooth }` is removed from `src/index.css`; Lenis owns
  smoothing now, and leaving it on would animate the router's scroll restoration
  and the virtualizer's corrections.
- `lenis/dist/lenis.css` is imported so Lenis's own `scroll-behavior: auto`
  rules apply.
- The existing instant-scroll adapter (`src/lib/dom/scroll-to-instant.ts`) gains
  a registry: the smooth-scroll component registers
  `lenis.scrollTo(offset, { immediate: true, force: true })` on mount and clears
  it on unmount. `VirtualSectionList` keeps calling that adapter, so measurement
  corrections bypass the easing instead of being animated and desyncing the
  virtualizer's offset read-back.
- Router restoration stays native; Lenis adopts the resulting scroll events.
  Navigation also calls `lenis.resize()` so page-height changes are picked up
  immediately rather than on the next `ResizeObserver` tick.

### Files

- add `lenis@1.3.27`, import `lenis/dist/lenis.css` in `src/main.tsx`
- new `src/components/layout/smooth-scroll.tsx`
- modify `src/components/layout/root-layout.tsx` (mount it)
- modify `src/lib/dom/scroll-to-instant.ts` (immediate-scroller registry)
- modify `src/index.css` (drop `scroll-behavior: smooth`)
- add `data-lenis-prevent` to the five nested scroll containers
- tests: instance options + cleanup, registry routing in the instant adapter

## Verification

- `pnpm lint`, `format`, `check`, `typecheck`, `test:unit`, `react-doctor`
- Browser: wheel-scroll each route and confirm eased motion; chat log still
  scrolls natively when hovering it; keyboard `PageDown`/arrows still work;
  navigating and going back restores position without a jump; virtualized
  sections stay aligned (`scrollMargin` still equals the document offset);
  with `prefers-reduced-motion: reduce` emulated, scrolling is 1:1 again.

## Tradeoffs

- Wheel smoothing is a deliberate change of feel, not just performance: scroll
  distance lags input by ~100ms.
- One extra rAF loop runs on every page.
- Users who dislike hijacked wheel scrolling have no in-page opt-out; the OS
  reduced-motion preference is the escape hatch.
