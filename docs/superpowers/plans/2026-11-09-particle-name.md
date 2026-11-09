# Particle Name Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the home page name as a permanent, theme-aware Canvas 2D particle cloud that gathers on mount.

**Architecture:** Pure math and sampling helpers live in `src/lib`; one client component owns canvas sizing, glyph rasterization, the rAF loop, observers, and theme syncing. The real `<h1>` text stays in flow and becomes `text-transparent` only after the first particle frame is ready.

**Tech Stack:** React 19, TypeScript, Canvas 2D, Vitest, Tailwind CSS 4

**Spec:** `docs/superpowers/specs/2026-11-09-particle-name-design.md`

## Global Constraints

- No new dependencies.
- Colours come from `--color-ink` and `--color-muted`; no literal palette hex in the component.
- DPR capped at 2.
- `prefers-reduced-motion: reduce` → one static frame, no rAF loop.
- Real text stays in the `<h1>`; canvas is `aria-hidden`.
- No rAF when the heading is off-screen or `document.hidden`.
- Theme attribute changes snap particle colours in the same frame.
- `pnpm lint`, `pnpm test`, `pnpm build` must pass.

## Review Focus

- **Font not loaded when sampling:** Geist may not be ready on first paint, producing a fallback-font silhouette. Sampling must wait for `document.fonts.ready` and must not run twice against stale metrics.
- **Descender clipping:** `leading-[0.9]` is shorter than the glyph box, so sampling a span at its exact rect height clips the `p` in `Gopendranath`. Sample into a taller offscreen canvas and centre glyphs on the span rect.
- **Resume jump:** pausing while off-screen or hidden leaves `lastTime` stale; on resume the first `dt` must be reset, not applied.
- **DPR change:** moving the window to a different display changes `devicePixelRatio` without a size change. The canvas buffer must be rebuilt when resolution changes.
- **Theme during view transition:** theme changes are captured in a view-transition snapshot. Particle colour must update synchronously with `data-theme`, before the next paint.
- **Point budget on large screens:** a 1300px+ viewport produces a 104px name; unbounded sampling can exceed 6k points. Cap with `thinTargets` at `MAX_POINTS`.

---

### Task 1: Particle math and colour helpers

**Files:**
- Create: `src/lib/particle-name.ts`
- Test: `src/lib/__tests__/particle-name.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type ParticleTone = 'ink' | 'muted'`
  - `interface PointTarget { x: number; y: number; tone: ParticleTone }`
  - `interface SpawnBounds { width: number; height: number; padding?: number }`
  - `interface Particle { x: number; y: number; vx: number; vy: number; targetX: number; targetY: number; size: number; phase: number; stiffness: number; delay: number; tone: ParticleTone }`
  - `interface RgbColor { r: number; g: number; b: number }`
  - `createParticles(targets: readonly PointTarget[], bounds: SpawnBounds, random?: () => number): Particle[]`
  - `retargetParticles(particles: Particle[], targets: readonly PointTarget[]): void`
  - `stepParticles(particles: Particle[], deltaSeconds: number, elapsedSeconds: number): void`
  - `sampleStride(fontSize: number): number`
  - `parseColor(value: string): RgbColor | null`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest'
import {
  createParticles,
  parseColor,
  retargetParticles,
  sampleStride,
  stepParticles,
  type Particle,
} from '../particle-name'

describe('parseColor', () => {
  it('parses theme hex values', () => {
    expect(parseColor('#f2f4f3')).toEqual({ r: 242, g: 244, b: 243 })
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255 })
  })

  it('parses computed rgb values', () => {
    expect(parseColor('rgb(10, 20, 30)')).toEqual({ r: 10, g: 20, b: 30 })
  })

  it('returns null for unsupported values', () => {
    expect(parseColor('nope')).toBeNull()
  })
})

describe('sampleStride', () => {
  it('keeps dense text dense and caps large type', () => {
    expect(sampleStride(48)).toBe(2)
    expect(sampleStride(104)).toBe(3)
    expect(sampleStride(400)).toBe(5)
  })
})

describe('createParticles', () => {
  it('spawns inside padded bounds with target data preserved', () => {
    const targets = [
      { x: 100, y: 50, tone: 'ink' as const },
      { x: 200, y: 60, tone: 'muted' as const },
    ]
    const particles = createParticles(
      targets,
      { width: 300, height: 100, padding: 20 },
      () => 0.5,
    )

    expect(particles).toHaveLength(2)
    expect(particles[0]).toMatchObject({
      targetX: 100,
      targetY: 50,
      tone: 'ink',
    })
    expect(particles[1].tone).toBe('muted')

    for (const particle of particles) {
      expect(particle.x).toBeGreaterThanOrEqual(-20)
      expect(particle.x).toBeLessThanOrEqual(320)
      expect(particle.y).toBeGreaterThanOrEqual(-20)
      expect(particle.y).toBeLessThanOrEqual(120)
      expect(particle.delay).toBeGreaterThanOrEqual(0)
      expect(particle.delay).toBeLessThanOrEqual(0.4)
      expect(particle.size).toBeGreaterThanOrEqual(0.9)
      expect(particle.size).toBeLessThanOrEqual(2.2)
      expect(particle.stiffness).toBeGreaterThanOrEqual(90)
      expect(particle.stiffness).toBeLessThanOrEqual(140)
    }
  })
})

describe('stepParticles', () => {
  it('converges on the target within a few seconds', () => {
    const particle = seedParticle({ targetX: 100, targetY: 100 })

    for (let frame = 0; frame < 240; frame += 1) {
      stepParticles([particle], 1 / 60, frame / 60)
    }

    expect(Math.abs(particle.x - 100)).toBeLessThan(1)
    expect(Math.abs(particle.y - 100)).toBeLessThan(1)
  })

  it('clamps a huge delta so a resume does not fling particles', () => {
    const particle = seedParticle({ targetX: 100, targetY: 100 })

    stepParticles([particle], 10, 0)

    expect(particle.x).toBeLessThan(50)
    expect(Number.isFinite(particle.x)).toBe(true)
  })

  it('does not move before the delay has elapsed', () => {
    const particle = seedParticle({
      targetX: 100,
      targetY: 100,
      delay: 1,
    })

    stepParticles([particle], 1 / 60, 0.5)
    expect(particle.x).toBe(0)

    stepParticles([particle], 1 / 60, 2)
    expect(particle.x).toBeGreaterThan(0)
  })
})

describe('retargetParticles', () => {
  it('updates every target and tone', () => {
    const particles = createParticles(
      [
        { x: 10, y: 10, tone: 'ink' as const },
        { x: 20, y: 20, tone: 'ink' as const },
      ],
      { width: 100, height: 100 },
      () => 0.5,
    )

    retargetParticles(particles, [
      { x: 5, y: 6, tone: 'muted' },
      { x: 7, y: 8, tone: 'ink' },
    ])

    expect(particles[0]).toMatchObject({ targetX: 5, targetY: 6, tone: 'muted' })
    expect(particles[1]).toMatchObject({ targetX: 7, targetY: 8, tone: 'ink' })
  })
})

function seedParticle(
  overrides: Partial<Particle>,
): Particle {
  const particle = createParticles(
    [{ x: 100, y: 100, tone: 'ink' }],
    { width: 100, height: 100, padding: 0 },
    () => 0.5,
  )[0]

  return { ...particle, x: 0, y: 0, vx: 0, vy: 0, delay: 0, ...overrides }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/lib/__tests__/particle-name.test.ts`
Expected: FAIL, cannot resolve `../particle-name`.

- [ ] **Step 3: Implement `src/lib/particle-name.ts`**

Use these formulas; the tests pin the bounds and convergence tolerance.

- `parseColor`: accept `#rgb`, `#rrggbb`, and `rgb(r, g, b)`; return `null` otherwise.
- `sampleStride`: `Math.min(5, Math.max(2, Math.round(fontSize / 40)))`.
- `createParticles`: `random` defaults to `Math.random`, `padding` defaults to `0`; for each target:
  - `x = -padding + random() * (width + padding * 2)`, same for `y`.
  - `delay = (target.x / bounds.width) * 0.25 + random() * 0.15`.
  - `size = 0.9 + random() * 1.3`.
  - `phase = random() * Math.PI * 2`.
  - `stiffness = 90 + random() * 50`.
  - `vx` and `vy` start at `0`.
- `stepParticles`: `dt = Math.min(deltaSeconds, 1 / 30)`; skip particles whose `delay > elapsedSeconds`; otherwise
  `p.vx = (p.vx + (p.targetX - p.x) * p.stiffness * dt) * 0.86`, the same for `y`, then `p.x += p.vx * dt`.
- `retargetParticles`: pair by index modulo `targets.length`; update `targetX`, `targetY`, `tone`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/lib/__tests__/particle-name.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/particle-name.ts src/lib/__tests__/particle-name.test.ts
git commit -m "feat: add particle name math helpers"
```

---

### Task 2: Glyph sampling helpers

**Files:**
- Create: `src/lib/particle-name-sampling.ts`
- Test: `src/lib/__tests__/particle-name-sampling.test.ts`

**Interfaces:**
- Consumes: `ParticleTone`, `PointTarget` from `./particle-name`.
- Produces:
  - `const MAX_POINTS = 4200`
  - `interface ImageBuffer { data: Uint8ClampedArray; width: number; height: number }`
  - `collectTargets(image: ImageBuffer, stride: number, tone: ParticleTone, alphaThreshold?: number): PointTarget[]`
  - `thinTargets(targets: readonly PointTarget[], max: number): PointTarget[]`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { collectTargets, thinTargets } from '../particle-name-sampling'

describe('collectTargets', () => {
  it('keeps pixels above the alpha threshold at stride 1', () => {
    const image = {
      width: 2,
      height: 2,
      data: new Uint8ClampedArray([
        255, 255, 255, 255,
        0, 0, 0, 0,
        0, 0, 0, 0,
        255, 255, 255, 255,
      ]),
    }

    expect(collectTargets(image, 1, 'ink')).toEqual([
      { x: 0, y: 0, tone: 'ink' },
      { x: 1, y: 1, tone: 'ink' },
    ])
  })

  it('samples every other pixel at stride 2', () => {
    const data = new Uint8ClampedArray(4 * 4 * 4).fill(255)
    const image = { width: 4, height: 4, data }

    const points = collectTargets(image, 2, 'muted')

    expect(points).toHaveLength(4)
    expect(points).toEqual([
      { x: 0, y: 0, tone: 'muted' },
      { x: 2, y: 0, tone: 'muted' },
      { x: 0, y: 2, tone: 'muted' },
      { x: 2, y: 2, tone: 'muted' },
    ])
  })
})

describe('thinTargets', () => {
  it('returns the input when already under the cap', () => {
    const targets = [
      { x: 0, y: 0, tone: 'ink' as const },
      { x: 1, y: 1, tone: 'ink' as const },
    ]

    expect(thinTargets(targets, 4)).toBe(targets)
  })

  it('spreads survivors across the full list and keeps the tone', () => {
    const targets = Array.from({ length: 10 }, (_, index) => ({
      x: index,
      y: index,
      tone: 'ink' as const,
    }))

    const thinned = thinTargets(targets, 4)

    expect(thinned).toHaveLength(4)
    expect(thinned[0].x).toBe(0)
    expect(thinned[3].x).toBe(9)
    expect(thinned.every((point) => point.tone === 'ink')).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/lib/__tests__/particle-name-sampling.test.ts`
Expected: FAIL, cannot resolve `../particle-name-sampling`.

- [ ] **Step 3: Implement `src/lib/particle-name-sampling.ts`**

- `MAX_POINTS = 4200`.
- `collectTargets`: loop `y` from 0 by `stride`, `x` from 0 by `stride`; include a point when `image.data[(y * width + x) * 4 + 3] > (alphaThreshold ?? 128)`.
- `thinTargets`: if `targets.length <= max`, return the same array. Otherwise pick index `Math.floor((position * targets.length) / max)` for `position` in `0..max - 1`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/lib/__tests__/particle-name-sampling.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/particle-name-sampling.ts src/lib/__tests__/particle-name-sampling.test.ts
git commit -m "feat: add glyph target sampling helpers"
```

---

### Task 3: ParticleName component and home integration

**Files:**
- Create: `src/components/home/particle-name.tsx`
- Modify: `src/routes/index.tsx` (replace the `<h1>` at lines 45–50)
- Test: `src/components/home/__tests__/particle-name.test.tsx`

**Interfaces:**
- Consumes: `createParticles`, `retargetParticles`, `stepParticles`, `sampleStride`, `parseColor`, `ParticleTone`, `PointTarget`; `collectTargets`, `thinTargets`, `MAX_POINTS`.
- Produces: `ParticleName({ lines, className }: { lines: readonly { text: string; muted?: boolean }[]; className?: string })`.

- [ ] **Step 1: Write the failing accessibility/fallback test**

```tsx
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ParticleName } from '../particle-name'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ParticleName', () => {
  it('keeps the full name as the heading accessible name', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)

    render(
      <ParticleName
        lines={[{ text: 'Gopendranath' }, { text: 'Sasmal', muted: true }]}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'Gopendranath Sasmal' }),
    ).toBeInTheDocument()
  })

  it('renders plain text and no canvas when Canvas 2D is unavailable', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)

    const { container } = render(
      <ParticleName
        lines={[{ text: 'Gopendranath' }, { text: 'Sasmal', muted: true }]}
      />,
    )

    expect(container.querySelector('canvas')).toBeNull()
    expect(container.querySelector('span')).not.toHaveClass('text-transparent')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/components/home/__tests__/particle-name.test.tsx`
Expected: FAIL, cannot resolve `../particle-name`.

- [ ] **Step 3: Implement the component**

Required behaviour:

- Render `<h1 ref aria-label={lines.map(line => line.text).join(' ')} translate="no" className={...}>`, one `<span>` per line (`block`, plus `text-muted` when `line.muted`), then the canvas when canvas is supported.
- Canvas is `aria-hidden`, `pointer-events-none absolute inset-0 h-full w-full`; the `<h1>` is `relative`. Merge the incoming `className` with `relative`.
- Detect support with `document.createElement('canvas').getContext('2d')` inside `try/catch`; if null or throwing, never render the canvas and never add `text-transparent`.
- On mount, after `document.fonts?.ready ?? Promise.resolve()`:
  - Per line span, read `getComputedStyle`, `getBoundingClientRect()`, and the heading rect.
  - Create an offscreen canvas of `ceil(rect.width)` by `ceil(fontSize * 1.4)`; set `ctx.font` from weight/size/family, `ctx.letterSpacing` from the computed value when the property exists, `textAlign = 'center'`, `textBaseline = 'middle'`, fill white.
  - Draw the line, read `getImageData`, call `collectTargets(image, sampleStride(fontSize), tone)`; offset each point by `rect.left - headingRect.left` and `rect.top - headingRect.top - (offscreenHeight - rect.height) / 2`.
  - Concatenate lines, call `thinTargets(all, MAX_POINTS)`.
  - Set canvas buffer to `headingRect.width * dpr` by `headingRect.height * dpr` with `dpr = Math.min(devicePixelRatio || 1, 2)`; draw in CSS pixels with `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`.
  - Create particles with `createParticles(targets, { width, height, padding: 24 })`, set `active` state true so the spans receive `text-transparent`.
- rAF loop: `stepParticles(particles, dt, elapsed)` then draw each particle as a radial sprite tinted from `colorsRef.current[tone]` (`{ ink: RgbColor; muted: RgbColor }`); sprite alpha fades in over the first 400ms; idle drift adds `Math.sin(elapsed * 0.7 + phase) * 0.5` and `Math.cos(elapsed * 0.53 + phase) * 0.5` at draw time only.
- Theme: read `--color-ink` and `--color-muted` from `getComputedStyle(document.documentElement)` and `parseColor` them. Re-read on a `MutationObserver` watching `data-theme` on `<html>`, and rebuild the two sprites; under reduced motion, redraw one static frame instead.
- Reduced motion: use `matchMedia('(prefers-reduced-motion: reduce)')`; sample once, place particles at their targets, draw one frame. Listen for changes and start or stop the loop.
- Pause: `IntersectionObserver` on the heading and `visibilitychange`; cancel rAF while paused and reset `lastTime` on resume.
- Resize: `ResizeObserver` on the heading, debounced with `requestAnimationFrame`; re-sample, call `retargetParticles`, restart the gather.
- DPR change: subscribe to `matchMedia(`(resolution: ${devicePixelRatio}dppx)`)` and rebuild the buffer on change; re-subscribe with the new ratio.
- Cleanup: cancel rAF, disconnect all observers, remove listeners, clear the canvas.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/components/home/__tests__/particle-name.test.tsx`
Expected: PASS.

- [ ] **Step 5: Integrate into the home route**

In `src/routes/index.tsx`, replace the `<h1>` with:

```tsx
<ParticleName
  className="mt-8 text-[clamp(3rem,8vw,6.5rem)] font-medium leading-[0.9] tracking-[-0.06em] text-ink"
  lines={[
    { text: profile.firstName },
    { text: profile.lastName, muted: true },
  ]}
/>
```

Add the import at the top.

- [ ] **Step 6: Run the full verification suite**

Run: `pnpm lint && pnpm test && pnpm build`
Expected: all pass, no new warnings.

- [ ] **Step 7: Browser QA**

Run the dev server (`pnpm dev`), then in Chrome at `/`:

- Confirm the name gathers once and settles into a particle rendering.
- Toggle theme mid-gather and after settle; confirm ink/muted colours swap with no flash.
- Resize from 1440px to 390px and back; confirm re-gather and no overflow.
- Scroll the name off-screen for 10s, return, and confirm no jump and the loop resumes.
- Emulate `prefers-reduced-motion: reduce` (Rendering panel); confirm a static particle name.
- Check the console for errors and confirm the heading text is visible to the accessibility tree.

- [ ] **Step 8: Commit**

```bash
git add src/components/home/particle-name.tsx src/components/home/__tests__/particle-name.test.tsx src/routes/index.tsx
git commit -m "feat: render home name as theme-aware particles"
```
