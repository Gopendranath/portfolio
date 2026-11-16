# Virtual Page Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Window-virtualize the content sections of `/projects`, `/about`, and `/more` so off-screen sections unmount, keeping scroll cost flat.

**Architecture:** A single `VirtualSectionList` primitive wraps `useWindowVirtualizer` (document scroll, not an inner scroll container) with `scrollMargin` measured from the list's document offset, absolute item placement, and `directDomUpdates` so scroll frames write transforms without React re-renders. Each route declares its sections as ordered data; static blocks (page header, hero, stateful controls) stay outside the list. Falls back to plain stacked sections when measurement is impossible or the page is being printed.

**Tech Stack:** React 19, `@tanstack/react-virtual@3.14.26` (already installed), TanStack Router (SPA, `scrollRestoration: true`), Tailwind v4, Vitest + Testing Library (jsdom 31), Biome 2.6.6.

**Spec:** `docs/superpowers/specs/2026-11-16-virtual-page-sections-design.md`

## Global Constraints

- `@tanstack/react-virtual` pinned at `3.14.26`; no other new dependencies.
- Document (window) scrolling only. Never introduce an inner `overflow-y-auto` scroll container on content pages.
- Virtualizer options: `overscan: 2`, `useFlushSync: false`, `directDomUpdates: true`, `getItemKey` returns the section `id`.
- Sections are rendered absolutely positioned with `top: 0; left: 0; width: 100%`; the virtualizer owns `transform` and container `height` when `directDomUpdates` is on.
- `/more`'s `AppearanceControls` and `/about`'s intro block (portrait canvas) are never virtualized.
- Fallback path must render every section in normal document flow (no spacer, no absolute positioning) when `ResizeObserver` is unavailable or `matchMedia('print')` matches.
- Verification commands: `pnpm lint`, `pnpm check`, `pnpm format`, `pnpm typecheck`, `pnpm test:unit`, `react-doctor --no-score`.
- The working tree already contains unrelated icon work. Commit only the paths named in each task; never `git add -A`.

## Review Focus

- Printing or saving the page as PDF: every section must appear, not just the mounted window.
- Environment without `ResizeObserver` (jsdom, old browsers): full content must render.
- Header height changes after mount (font swap, theme toggle, window resize): `scrollMargin` must follow, or sections overlap/skip.
- Scrolling upward past a section whose measured height differed from its estimate: no visible jump.
- Browser back/forward into a deep scroll position: correct content, no permanent blank area.

---

### Task 1: `VirtualSectionList` primitive

**Files:**
- Create: `src/components/ui/virtual-section-list.tsx`
- Test: `src/components/ui/__tests__/virtual-section-list.test.tsx`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces:
  - `export interface VirtualSection { id: string; estimate: number; content: ReactNode }`
  - `export function VirtualSectionList({ sections, className }: { sections: readonly VirtualSection[]; className?: string })`
  - Outer element carries `data-scroll-margin` (current `scrollMargin` in px) for test and debug reads.

- [ ] **Step 1: Write the failing tests**

Create `src/components/ui/__tests__/virtual-section-list.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { type VirtualSection, VirtualSectionList } from '@/components/ui/virtual-section-list'

const sections: VirtualSection[] = Array.from({ length: 6 }, (_, index) => ({
  id: `section-${index}`,
  estimate: 600,
  content: <p>section {index + 1}</p>,
}))

class StubResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const originalResizeObserver = globalThis.ResizeObserver

function stubRects(top: () => number) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const isList = this.dataset.scrollMargin !== undefined
    return {
      x: 0,
      y: isList ? top() : 0,
      top: isList ? top() : 0,
      left: 0,
      right: 800,
      bottom: (isList ? top() : 0) + 600,
      width: 800,
      height: 600,
      toJSON: () => ({}),
    } as DOMRect
  })
}

afterEach(() => {
  globalThis.ResizeObserver = originalResizeObserver
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('renders every section in flow when ResizeObserver is unavailable', () => {
  // @ts-expect-error test-only removal of a browser global
  delete globalThis.ResizeObserver

  const { container } = render(<VirtualSectionList sections={sections} />)

  expect(screen.getAllByText(/^section \d$/)).toHaveLength(sections.length)
  expect(container.querySelectorAll('[data-index]')).toHaveLength(0)
})

it('mounts only the sections near the viewport when measurement is available', () => {
  globalThis.ResizeObserver = StubResizeObserver as unknown as typeof ResizeObserver
  stubRects(() => 0)

  render(<VirtualSectionList sections={sections} />)

  expect(screen.getByText('section 1')).toBeInTheDocument()
  expect(screen.queryByText('section 6')).not.toBeInTheDocument()
})

it('re-measures the scroll margin when the page above the list resizes', () => {
  globalThis.ResizeObserver = StubResizeObserver as unknown as typeof ResizeObserver
  let listTop = 200
  stubRects(() => listTop)

  render(<VirtualSectionList sections={sections} />)

  const list = document.querySelector('[data-scroll-margin]')
  expect(list).toHaveAttribute('data-scroll-margin', '200')

  listTop = 400
  fireEvent(window, new Event('resize'))

  expect(list).toHaveAttribute('data-scroll-margin', '400')
})

it('renders every section while printing', () => {
  globalThis.ResizeObserver = StubResizeObserver as unknown as typeof ResizeObserver
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === 'print',
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  }))

  render(<VirtualSectionList sections={sections} />)

  expect(screen.getAllByText(/^section \d$/)).toHaveLength(sections.length)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/components/ui/__tests__/virtual-section-list.test.tsx`
Expected: FAIL — cannot resolve `@/components/ui/virtual-section-list`.

- [ ] **Step 3: Implement the primitive**

Create `src/components/ui/virtual-section-list.tsx`:

```tsx
import { Fragment, type ReactNode, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { cn } from '@/lib/cn'

export interface VirtualSection {
  id: string
  /** Estimated rendered height. Corrected by measurement on mount. */
  estimate: number
  content: ReactNode
}

interface VirtualSectionListProps {
  sections: readonly VirtualSection[]
  className?: string
}

function subscribeToPrint(onChange: () => void) {
  const query = window.matchMedia('print')
  query.addEventListener('change', onChange)
  window.addEventListener('beforeprint', onChange)
  window.addEventListener('afterprint', onChange)
  return () => {
    query.removeEventListener('change', onChange)
    window.removeEventListener('beforeprint', onChange)
    window.removeEventListener('afterprint', onChange)
  }
}

function isPrinting() {
  return window.matchMedia('print').matches
}

function usePrintMedia() {
  return useSyncExternalStore(subscribeToPrint, isPrinting, () => false)
}

function useScrollMargin(enabled: boolean) {
  const listRef = useRef<HTMLDivElement>(null)
  const [scrollMargin, setScrollMargin] = useState(0)

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list || !enabled) {
      return
    }

    const update = () => {
      setScrollMargin(list.getBoundingClientRect().top + window.scrollY)
    }

    update()
    window.addEventListener('resize', update)
    const observer = new ResizeObserver(update)
    observer.observe(document.body)

    return () => {
      window.removeEventListener('resize', update)
      observer.disconnect()
    }
  }, [enabled])

  return { listRef, scrollMargin }
}

export function VirtualSectionList({ sections, className }: VirtualSectionListProps) {
  const [canMeasure] = useState(() => typeof ResizeObserver !== 'undefined')
  const printing = usePrintMedia()
  const enabled = canMeasure && !printing
  const { listRef, scrollMargin } = useScrollMargin(enabled)

  const virtualizer = useWindowVirtualizer({
    enabled,
    count: sections.length,
    estimateSize: (index) => sections[index]?.estimate ?? 400,
    getItemKey: (index) => sections[index]?.id ?? index,
    scrollMargin,
    overscan: 2,
    useFlushSync: false,
    directDomUpdates: true,
  })

  if (!enabled) {
    return (
      <div ref={listRef} className={cn(className)}>
        {sections.map((section) => (
          <Fragment key={section.id}>{section.content}</Fragment>
        ))}
      </div>
    )
  }

  return (
    <div ref={listRef} className={cn(className)} data-scroll-margin={scrollMargin}>
      <div ref={virtualizer.containerRef} className="relative">
        {virtualizer.getVirtualItems().map((item) => (
          <div
            key={item.key}
            data-index={item.index}
            ref={virtualizer.measureElement}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%' }}
          >
            {sections[item.index]?.content}
          </div>
        ))}
      </div>
    </div>
  )
}
```

Notes the implementation must respect:
- The spacer div gets its height from `virtualizer.containerRef`; never set `height` on it in JSX.
- Item wrappers must not set `transform`; the virtualizer owns it.
- `data-scroll-margin` must reflect the measured value (the tests read it).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm vitest run src/components/ui/__tests__/virtual-section-list.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Lint, format, typecheck**

Run: `pnpm exec biome check src/components/ui/virtual-section-list.tsx src/components/ui/__tests__/virtual-section-list.test.tsx && pnpm typecheck`
Expected: no fixes applied, `tsc -b` silent.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/virtual-section-list.tsx src/components/ui/__tests__/virtual-section-list.test.tsx
git commit -m "feat: add virtualized section list primitive"
```

---

### Task 2: Virtualize `/projects`

**Files:**
- Modify: `src/routes/projects.tsx` (whole `ProjectsPage` body)

**Interfaces:**
- Consumes: `VirtualSectionList`, `VirtualSection` from Task 1.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Replace the grid + note block with section data**

Keep `<PageHeader>` and the "All projects" heading row static. Below them:

```tsx
const projectSections: VirtualSection[] = [
  {
    id: 'projects-grid',
    estimate: 1100,
    content: (
      <div className="grid gap-4 md:grid-cols-2">
        ...existing ProjectCard map...
      </div>
    ),
  },
  {
    id: 'projects-more',
    estimate: 90,
    content: (
      <p className="mt-12 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
        ...existing "More experiments on GitHub" markup...
      </p>
    ),
  },
]
```

Render `<VirtualSectionList sections={projectSections} className="mt-8" />` in place of the old grid, and remove `content-auto [contain-intrinsic-size:auto_600px]` from the grid class (it fights measurement).

- [ ] **Step 2: Typecheck, lint, test**

Run: `pnpm typecheck && pnpm exec biome check src/routes/projects.tsx && pnpm vitest run src/components/projects/__tests__/project-card.test.tsx`
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/routes/projects.tsx
git commit -m "perf: virtualize projects page sections"
```

---

### Task 3: Virtualize `/about`

**Files:**
- Modify: `src/routes/about.tsx`

**Interfaces:**
- Consumes: `VirtualSectionList`, `VirtualSection` from Task 1.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Wrap the below-fold sections**

Keep `<PageHeader>` and the intro grid (portrait canvas + bio) static as they are. Replace the `Stack`, `How I work` `PageSection`s and the trailing resume line with:

```tsx
const aboutSections: VirtualSection[] = [
  {
    id: 'about-stack',
    estimate: 520,
    content: (
      <PageSection label="Stack" ariaLabel="Technical stack">
        ...existing grid of `profile.stack` groups...
      </PageSection>
    ),
  },
  {
    id: 'about-principles',
    estimate: 300,
    content: (
      <PageSection label="How I work" ariaLabel="Working principles">
        ...existing principles grid...
      </PageSection>
    ),
  },
  {
    id: 'about-resume',
    estimate: 90,
    content: (
      <p className="mt-20 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
        ...existing "Resume PDF coming soon." markup...
      </p>
    ),
  },
]
```

Render `<VirtualSectionList sections={aboutSections} />` after the intro grid.

- [ ] **Step 2: Typecheck, lint, test**

Run: `pnpm typecheck && pnpm exec biome check src/routes/about.tsx && pnpm test:unit`
Expected: all pass (full unit suite).

- [ ] **Step 3: Commit**

```bash
git add src/routes/about.tsx
git commit -m "perf: virtualize about page sections"
```

---

### Task 4: Virtualize `/more`

**Files:**
- Modify: `src/routes/more.tsx`

**Interfaces:**
- Consumes: `VirtualSectionList`, `VirtualSection` from Task 1.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Split into two lists around `AppearanceControls`**

Keep `<PageHeader>`, the "About this site" section, and `<AppearanceControls />` static, in their current order. Replace `Features` with:

```tsx
const featureSections: VirtualSection[] = [
  {
    id: 'more-features',
    estimate: 360,
    content: (
      <PageSection label="Features" ariaLabel="Site features">
        ...existing siteFeatures grid...
      </PageSection>
    ),
  },
]
```

and the tail (`SSH access`, `Colophon`) with:

```tsx
const tailSections: VirtualSection[] = [
  { id: 'more-ssh', estimate: 280, content: ( ...existing SSH PageSection... ) },
  { id: 'more-colophon', estimate: 320, content: ( ...existing Colophon PageSection... ) },
]
```

Render `<VirtualSectionList sections={featureSections} />` where Features was, then `<AppearanceControls />`, then `<VirtualSectionList sections={tailSections} />`.

- [ ] **Step 2: Typecheck, lint, test**

Run: `pnpm typecheck && pnpm exec biome check src/routes/more.tsx && pnpm test:unit`
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/routes/more.tsx
git commit -m "perf: virtualize more page sections"
```

---

### Task 5: Browser verification and estimate calibration

**Files:**
- Modify: `src/routes/projects.tsx`, `src/routes/about.tsx`, `src/routes/more.tsx` (estimate values only, if measurements say so)

**Interfaces:**
- Consumes: all of the above.
- Produces: final state of the feature.

- [ ] **Step 1: Run the full gate**

Run: `pnpm lint && pnpm format && pnpm check && pnpm typecheck && pnpm test:unit && react-doctor --no-score`
Expected: no lint/format/check/type changes, 45+ test files pass, react-doctor reports no new issues in the changed files.

- [ ] **Step 2: Measure in the browser**

For each of `/projects`, `/about`, `/more` at 1440×900 and 390×844 using `agent-browser` against `http://localhost:5173` (the dev server runs on the user's side):

1. Read `document.body.scrollHeight` and the list's `data-scroll-margin`.
2. Scroll in ~600px steps to the bottom, collecting for each stop the bounding boxes of `[data-index]` wrappers; assert consecutive wrappers satisfy `next.top === prev.bottom` (±1px) and none has `height: 0`.
3. Compare each wrapper's measured height with its `estimate`; update the estimate constants to the measured value rounded to the nearest 20px, then reload and confirm the first frame lands without a visible gap.
4. Confirm `AppearanceControls` still holds its selection after scrolling to the footer and back.
5. Print preview (or `agent-browser` print media emulation) shows every section.
6. Scroll to the bottom, navigate to another route and use browser back: the page lands at the restored offset with real content mounted (no blank band), and scrolling up from there shows no jump.

- [ ] **Step 3: Fix anything the measurements expose**

If the virtualized region shows overlap, gaps, or a scroll jump, check in this order: `scrollMargin` staleness (header height changed), spacer height not owned by the virtualizer, a section left with `content-visibility`/`contain` styles, or an item wrapper setting its own `transform`. Only if `directDomUpdates` is the proven cause, set `directDomUpdates: false` (structure and tests are unchanged) and re-run Step 2.

- [ ] **Step 4: Commit**

```bash
git add src/routes/projects.tsx src/routes/about.tsx src/routes/more.tsx package.json pnpm-lock.yaml
git commit -m "perf: calibrate virtualized section heights"
```
