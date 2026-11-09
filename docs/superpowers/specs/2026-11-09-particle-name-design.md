# Particle Name — Short Design

- **Date:** 2026-11-09
- **Status:** Proposed, awaiting approval
- **Project:** `portfolio-dev-v1`
- **Scope:** Home page name only

## Intent

The home `<h1>` should read as a live point cloud: the name converges from scattered particles on mount and stays particle-rendered while the page is visible. It must follow the site theme and stay accessible.

Reference: `gather.be-of-dao.com` (tab 15). We take the convergence behaviour, not its WebGL pipeline.

## Goals

- Replace the static name with ~3–4k particles that gather into `Gopendranath Sasmal`.
- Keep the current type layout: Geist Variable, `clamp(3rem, 8vw, 6.5rem)`, `leading-[0.9]`, `tracking-[-0.06em]`; first line ink, second line muted.
- Enter with a staggered converge from a scattered start.
- Recolour instantly on theme switch, using the same resolved ink/muted colours as the CSS theme. No separate palette.
- Stay legible, selectable, and announced as a normal `<h1>`.
- Idle without wasting battery: no rAF when off-screen or when the tab is hidden.
- Respect `prefers-reduced-motion`: draw one static particle frame, no animation.

## Non-goals

- No WebGL, Three.js, OGL, or new dependency.
- No 3D camera, drag, zoom, pointer repulsion, or hover scatter in v1.
- No changes to other headings, hero copy, or page layout.
- No Web Worker; the point count does not justify one.

## Constraints

- Canvas 2D only; render at DPR capped at 2.
- Colours come from the theme variables (`--color-ink`, `--color-muted`), never hard-coded hex.
- The real name text stays in the `<h1>` for SEO, selection, and screen readers.
- Theme switching currently snaps (`data-theme-switching` disables transitions), so particles snap too; do not fade colours under the view transition.
- Must pass `pnpm lint`, `pnpm test`, `pnpm build`.

## Approaches considered

- **Canvas 2D + sprite particles (chosen).** No dependency, ~150 lines, enough for name-scale density, easy to pause and test. Depth is faked with size and alpha.
- **Raw WebGL point cloud.** Closer to Gather and cheaper at 10k+ points, but ~300 lines of shader, buffer, context-loss, and fallback code for a heading. Rejected as overkill.
- **Three.js / OGL.** Fastest path to 3D, adds a heavy renderer for one element. Rejected.

## Design

### Elements

```tsx
<h1 className="relative mt-8 ...">
  <span className="block">Gopendranath</span>
  <span className="block text-muted">Sasmal</span>
  <canvas aria-hidden="true" className="pointer-events-none absolute inset-0" />
</h1>
```

The two spans stay in normal flow, so they keep the exact responsive layout and provide per-line metrics; the canvas is absolutely positioned over the `<h1>` box. Once particles are ready, the spans get `text-transparent` (still selectable and readable by assistive tech). If Canvas 2D is unavailable, they stay visible and the canvas is never mounted. No duplicated hidden copy.

### Sampling

1. Wait for `document.fonts.ready`.
2. For each line, read computed `font`, `font-size`, `letter-spacing`, and line rect.
3. Draw the line into an offscreen canvas at 1x, apply `ctx.letterSpacing` when supported, sample pixels on an adaptive stride targeting ~3.2k points total (2.8k–3.8k range).
4. Map sampled pixels to the line's rect. Points inherit the line's tone (ink or muted).
5. Re-sample on `ResizeObserver`; particles re-target and gather again without layout shift.

### Motion

- **Enter:** particles spawn scattered across the `<h1>` bounds plus margin, then spring to targets with per-point stiffness and a left-to-right stagger. Duration roughly 900–1200ms.
- **Idle:** low-amplitude sinusoidal drift (±0.6px) with per-particle phase.
- **Resize:** re-sample targets, re-run a short gather.
- **Theme change:** snap particle colours in the same frame as the theme attribute change.
- **Pause:** `IntersectionObserver` on the `<h1>` plus `visibilitychange`; stop the loop when hidden.
- **Reduced motion:** sample once, draw one frame, no rAF loop; redraw a single frame on theme change or resize.

### Files

```text
src/
  components/home/
    particle-name.tsx        # h1, canvas, lifecycle, observers
    __tests__/particle-name.test.tsx
  lib/
    particle-name.ts         # pure helpers: colours, particle init, spring step, sampling stride
    __tests__/particle-name.test.ts
  routes/index.tsx           # swap the current h1 for <ParticleName />
```

`particle-name.ts` stays pure and testable under jsdom. Canvas sampling and drawing live in the component; jsdom tests cover the math helpers and the accessible `<h1>` name.

### API

```ts
interface ParticleNameLine {
  text: string
  muted?: boolean
}

interface ParticleNameProps {
  lines: readonly ParticleNameLine[]
  className?: string
}
```

Home passes `profile.firstName` and `profile.lastName` (muted), so the name is still data-driven.

## Acceptance criteria

- Home name is particle-rendered after mount and remains so while visible.
- First line uses ink, second uses muted, in both themes; toggling theme updates particle colours immediately.
- `<h1>` accessible name is still `Gopendranath Sasmal`; text remains selectable.
- Resize re-lays out and re-gathers without visual jumps or overflow.
- No rAF work when the name is off-screen or the tab is hidden.
- `prefers-reduced-motion: reduce` renders a static particle name and no animation.
- No new dependencies; lint, tests, and production build pass.

## Verification

- `pnpm lint`, `pnpm test`, `pnpm build`.
- Dev-server QA in dark and light themes, at 1440px, 1024px, and 390px widths.
- Toggle theme mid-gather and after settle; confirm colours and no flash.
- Scroll away and back; confirm the loop pauses and resumes.
- Emulate `prefers-reduced-motion`; confirm static frame.
- Inspect for console errors and layout shift.
