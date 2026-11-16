# Lenis Smooth Scrolling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wheel scrolling on every route is eased by one Lenis instance, without breaking the sidebar/dock/scroll-blur chrome, the virtualized sections, or nested chat scrollers.

**Architecture:** `Lenis` (window scroll, `autoRaf`) mounted once in `RootLayout`; its immediate `scrollTo` is registered into the existing instant-scroll adapter so virtualizer corrections bypass easing; nested scroll containers opt out with `data-lenis-prevent`.

**Tech Stack:** React 19, `lenis@1.3.27`, TanStack Router (SPA, `scrollRestoration: true`), `@tanstack/react-virtual@3.14.26`, Tailwind v4, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-16-lenis-smooth-scroll-design.md`

## Global Constraints

- `lenis` pinned at `1.3.27`; no other new dependencies.
- Lenis options: `autoRaf: true`, `duration: 1.1`, `stopInertiaOnNavigate: true`, `syncTouch: false`. Do **not** pass `anchors` — the skip link must keep moving focus.
- `respectReducedMotion` stays at the library default (`true`).
- `html { scroll-behavior: smooth }` must be removed; `lenis/dist/lenis.css` must be imported.
- No inner scroll container may be captured by Lenis: chat log, owner inbox, history list, message editor, sidebar carry `data-lenis-prevent`.
- Verification: `pnpm lint`, `pnpm format`, `pnpm check`, `pnpm typecheck`, `pnpm test:unit`, `react-doctor --no-score`.
- Working tree still carries unrelated icon work. Commit only the paths named per task.

## Review Focus

- Skip link and focus movement still work (no anchor interception).
- Chat log/inbox/sidebar wheel scrolling stays native and unprejudiced by Lenis.
- Back/forward scroll restoration lands without an inertial slide afterwards.
- Virtualizer corrections stay instant while Lenis is active (`scrollMargin` alignment unchanged).
- Reduced-motion users get 1:1 scrolling with no lag.

---

### Task 1: Dependency, stylesheet, and scroll-behavior removal

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml` (dependency)
- Modify: `src/main.tsx` (import `lenis/dist/lenis.css`)
- Modify: `src/index.css:41` (remove `scroll-behavior: smooth`)

**Interfaces:**
- Produces: `Lenis` importable from `lenis`; document no longer declares smooth scrolling.

- [ ] **Step 1: Install and wire**

Run `pnpm add lenis@1.3.27`. Add `import 'lenis/dist/lenis.css'` to `src/main.tsx` above `./index.css`. Delete `scroll-behavior: smooth;` from `src/index.css`.

- [ ] **Step 2: Verify**

Run `pnpm typecheck && pnpm build`
Expected: build succeeds, `dist/assets/*.css` contains `.lenis` rules.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml src/main.tsx src/index.css
git commit -m "chore: add lenis and drop css smooth scrolling"
```

---

### Task 2: Immediate-scroller registry in the instant-scroll adapter

**Files:**
- Modify: `src/lib/dom/scroll-to-instant.ts`
- Test: `src/lib/dom/__tests__/scroll-to-instant.test.ts` (create)

**Interfaces:**
- Produces: `setImmediateScroller(scroller: ((offset: number) => void) | null): void`. `scrollWindowInstant(offset, { behavior })` unchanged in signature.

- [ ] **Step 1: Write the failing tests**

```ts
import { afterEach, expect, it, vi } from 'vitest'
import { scrollWindowInstant, setImmediateScroller } from '@/lib/dom/scroll-to-instant'

afterEach(() => {
  setImmediateScroller(null)
  vi.unstubAllGlobals()
})

it('falls back to a window scroll when no smooth scroller is registered', () => {
  const scrollTo = vi.fn()
  vi.stubGlobal('scrollTo', scrollTo)

  scrollWindowInstant(480, {})

  expect(scrollTo).toHaveBeenCalledWith({ top: 480, behavior: 'instant' })
})

it('routes corrections through the registered scroller', () => {
  const scrollTo = vi.fn()
  const immediate = vi.fn()
  vi.stubGlobal('scrollTo', scrollTo)
  setImmediateScroller(immediate)

  scrollWindowInstant(900, {})

  expect(immediate).toHaveBeenCalledWith(900)
  expect(scrollTo).not.toHaveBeenCalled()
})

it('leaves smooth requests to the window', () => {
  const scrollTo = vi.fn()
  const immediate = vi.fn()
  vi.stubGlobal('scrollTo', scrollTo)
  setImmediateScroller(immediate)

  scrollWindowInstant(300, { behavior: 'smooth' })

  expect(immediate).not.toHaveBeenCalled()
  expect(scrollTo).toHaveBeenCalledWith({ top: 300, behavior: 'smooth' })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run src/lib/dom/__tests__/scroll-to-instant.test.ts`
Expected: FAIL — `setImmediateScroller` is not exported.

- [ ] **Step 3: Implement**

Add a module-level `immediateScroller` slot and `setImmediateScroller`; in `scrollWindowInstant`, when the effective behavior is not `smooth` and a scroller is registered, call it and return.

- [ ] **Step 4: Run to verify pass**

Run: `pnpm vitest run src/lib/dom/__tests__/scroll-to-instant.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/dom/scroll-to-instant.ts src/lib/dom/__tests__/scroll-to-instant.test.ts
git commit -m "feat: allow an immediate scroller to own virtualizer corrections"
```

---

### Task 3: `SmoothScroll` component and root mount

**Files:**
- Create: `src/components/layout/smooth-scroll.tsx`
- Modify: `src/components/layout/root-layout.tsx`
- Test: `src/components/layout/__tests__/smooth-scroll.test.tsx` (create)

**Interfaces:**
- Consumes: `setImmediateScroller` from Task 2.
- Produces: `export function SmoothScroll(): null`.

- [ ] **Step 1: Write the failing test**

Mock `lenis` (`vi.mock('lenis', ...)`) with a class recording constructor options, `scrollTo`, and `destroy`. Mock `@tanstack/react-router`'s `useRouterState` to return `{ location: { pathname: '/about' } }`. Assert: instance created once with `{ autoRaf: true, duration: 1.1, stopInertiaOnNavigate: true, syncTouch: false }`, `anchors` absent, corrections route to `lenis.scrollTo(offset, { immediate: true, force: true })`, `destroy()` on unmount, and `scrollWindowInstant` falls back to `window.scrollTo` after unmount.

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run src/components/layout/__tests__/smooth-scroll.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
export function SmoothScroll() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: true,
      duration: 1.1,
      stopInertiaOnNavigate: true,
      syncTouch: false,
    })
    lenisRef.current = lenis
    setImmediateScroller((offset) => {
      lenis.scrollTo(offset, { immediate: true, force: true })
    })

    return () => {
      setImmediateScroller(null)
      lenisRef.current = null
      lenis.destroy()
    }
  }, [])

  useEffect(() => {
    lenisRef.current?.resize()
  }, [pathname])

  return null
}
```

Mount `<SmoothScroll />` in `RootLayout` inside `AppearanceProvider`, next to `<SkipLink />`.

- [ ] **Step 4: Run to verify pass**

Run: `pnpm vitest run src/components/layout/__tests__/smooth-scroll.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/smooth-scroll.tsx src/components/layout/__tests__/smooth-scroll.test.tsx src/components/layout/root-layout.tsx
git commit -m "feat: add lenis smooth scrolling to every route"
```

---

### Task 4: Opt nested scrollers out of Lenis

**Files:**
- Modify: `src/components/chat/message-list.tsx:85`
- Modify: `src/components/chat/owner-inbox.tsx:48`
- Modify: `src/components/chat/history/assistant-history-content.tsx:30`
- Modify: `src/components/chat/message/message-editor.tsx:36`
- Modify: `src/components/layout/app-sidebar.tsx:14`
- Test: `src/components/chat/__tests__/owner-inbox.test.tsx` (add one assertion)

**Interfaces:**
- Produces: nothing consumed later.

- [ ] **Step 1: Add the attributes**

Append `data-lenis-prevent` to those five elements' class lists (it is a boolean HTML attribute; React renders it as `data-lenis-prevent="true"`). The message editor's textarea also needs it — wheel over a textarea must scroll the text, not the page.

- [ ] **Step 2: Add the assertion**

In `owner-inbox.test.tsx`, assert the scroll container carries `data-lenis-prevent`.

- [ ] **Step 3: Run**

Run: `pnpm vitest run src/components/chat/__tests__/owner-inbox.test.tsx && pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/chat/message-list.tsx src/components/chat/owner-inbox.tsx src/components/chat/history/assistant-history-content.tsx src/components/chat/message/message-editor.tsx src/components/layout/app-sidebar.tsx src/components/chat/__tests__/owner-inbox.test.tsx
git commit -m "fix: keep nested scrollers native under lenis"
```

---

### Task 5: Browser verification

**Files:** none (verification only)

- [ ] **Step 1: Full gate**

`pnpm lint && pnpm format && pnpm check && pnpm typecheck && pnpm test:unit && react-doctor --no-score`

- [ ] **Step 2: Verify in Chrome** at 1440×900 and 390×844

For `/`, `/projects`, `/about`, `/contact`, `/more`:

1. Wheel scroll: content eases rather than steps; `scrollY` lags the wheel by ~100ms.
2. Keyboard `PageDown` and arrows still scroll.
3. Skip link (Tab, Enter) moves focus to `#main-content` and scrolls there.
4. Virtualized sections still tile: `data-scroll-margin` equals `list.getBoundingClientRect().top + scrollY`.
5. `/chat`: wheel over the message log scrolls messages, not the page; wheel elsewhere scrolls the page.
6. Navigate away and back: restored scroll position holds with no inertial drift afterwards.
7. Emulate `prefers-reduced-motion: reduce`: scroll is 1:1.

- [ ] **Step 3: Report and commit any fixes**

Fixes found here get their own commit with the affected file list.
