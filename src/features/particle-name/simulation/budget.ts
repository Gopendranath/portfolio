export const MAX_DPR = 3

const MIN_PARTICLES = 1800
const MAX_PARTICLES = 4200

export { MAX_PARTICLES, MIN_PARTICLES }

const PARTICLES_PER_CSS_PIXEL = 0.024

/** Particle count for one canvas, scaled down on high-DPR displays. */
export function particleBudget(width: number, height: number, dpr = 1): number {
  const area = Math.max(0, width) * Math.max(0, height)
  const density = PARTICLES_PER_CSS_PIXEL / Math.sqrt(Math.max(1, dpr))
  const budget = Math.round(area * density)

  return Math.min(MAX_PARTICLES, Math.max(MIN_PARTICLES, budget))
}

const DUST_RATIO = 0.15
const MAX_DUST = 420
// Narrow headings hold far fewer particles, so the proportional count alone
// all but removes the dust on phones. A floor keeps the drift visible there.
const MIN_DUST = 150
const DUST_REFERENCE_WIDTH = 900
const DUST_MIN_WIDTH_FACTOR = 0.45

/** Caps the backing-store resolution so 3x phones stay affordable. */
export function clampDpr(value: number | undefined): number {
  return Math.min(value || 1, MAX_DPR)
}

/**
 * Converts the rendered font size into a domain scale for particle and dust
 * radii. Small headings need finer grains to stay legible.
 */
export function particleScaleForFontSize(fontSize: number): number {
  const size = Number.isFinite(fontSize) && fontSize > 0 ? fontSize : 16

  return Math.max(0.9, Math.min(1, size / 96))
}

export interface DustBudgetInput {
  particleCount: number
  particleScale: number
  width: number
}

/**
 * Dust motes are a fraction of the particle field, narrowed on small headings
 * but floored so the drift stays visible on phones instead of disappearing.
 */
export function dustBudget({
  particleCount,
  particleScale,
  width,
}: DustBudgetInput): number {
  if (particleCount <= 0) {
    return MIN_DUST
  }

  const widthFactor = Math.min(
    1,
    Math.max(DUST_MIN_WIDTH_FACTOR, width / DUST_REFERENCE_WIDTH),
  )
  const proportional = particleCount * DUST_RATIO * particleScale * widthFactor

  return Math.min(MAX_DUST, Math.max(MIN_DUST, Math.round(proportional)))
}
