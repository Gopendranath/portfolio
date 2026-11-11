import {
  type DustParticle,
  type Particle,
  type ParticleTone,
  parseColor,
  type RgbColor,
} from '@/features/particle-name/simulation'

const SPRITE_SIZE = 8
const DRIFT_ANGLE = Math.PI / 6
const DRIFT_DISTANCE = 1.2
const SCAN_PERIOD_SECONDS = 7
const SCAN_BAND = 80
const DUST_TRAIL_SECONDS = 0.9
const STREAK_LENGTH = 96
const STREAK_THICKNESS = 8

type SpriteTone = ParticleTone | 'accent'

export interface ParticleColors {
  ink: RgbColor
  muted: RgbColor
  accent: RgbColor
}

export type ParticleSprites = Record<SpriteTone, HTMLCanvasElement>
export type ParticleStreaks = Record<ParticleTone, HTMLCanvasElement>

export interface FrameScene {
  particles: Particle[]
  dust: DustParticle[]
  sprites: ParticleSprites
  streaks: ParticleStreaks
  width: number
  height: number
  elapsed: number
  reduced: boolean
  scan: boolean
  dustTrails: boolean
  /** Domain scaling for particle and dust radii; small headings need finer grains. */
  particleScale: number
}

export function readParticleColors(): ParticleColors {
  const style = window.getComputedStyle(document.documentElement)
  const ink = parseColor(style.getPropertyValue('--color-ink')) ?? {
    r: 255,
    g: 255,
    b: 255,
  }

  return {
    ink,
    muted: parseColor(style.getPropertyValue('--color-muted')) ?? ink,
    accent: parseColor(style.getPropertyValue('--color-accent')) ?? ink,
  }
}

function buildSprite(color: RgbColor): HTMLCanvasElement {
  const sprite = document.createElement('canvas')
  sprite.width = SPRITE_SIZE
  sprite.height = SPRITE_SIZE
  const context = sprite.getContext('2d')
  const center = SPRITE_SIZE / 2

  if (!context) {
    return sprite
  }

  const gradient = context.createRadialGradient(
    center,
    center,
    0,
    center,
    center,
    center,
  )
  const rgb = `${color.r}, ${color.g}, ${color.b}`

  gradient.addColorStop(0, `rgba(${rgb}, 1)`)
  gradient.addColorStop(0.55, `rgba(${rgb}, 0.85)`)
  gradient.addColorStop(1, `rgba(${rgb}, 0)`)
  context.fillStyle = gradient
  context.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE)

  return sprite
}

export function buildSprites(colors: ParticleColors): ParticleSprites {
  return {
    ink: buildSprite(colors.ink),
    muted: buildSprite(colors.muted),
    accent: buildSprite(colors.accent),
  }
}

function buildStreak(color: RgbColor): HTMLCanvasElement {
  const streak = document.createElement('canvas')
  streak.width = STREAK_LENGTH
  streak.height = STREAK_THICKNESS
  const context = streak.getContext('2d')

  if (!context) {
    return streak
  }

  const mid = STREAK_THICKNESS / 2
  const rgb = `${color.r}, ${color.g}, ${color.b}`
  const gradient = context.createLinearGradient(0, 0, STREAK_LENGTH, 0)

  gradient.addColorStop(0, `rgba(${rgb}, 0)`)
  gradient.addColorStop(0.7, `rgba(${rgb}, 0.1)`)
  gradient.addColorStop(1, `rgba(${rgb}, 0.75)`)
  context.fillStyle = gradient
  context.fillRect(0, 0, STREAK_LENGTH, STREAK_THICKNESS)

  const head = context.createRadialGradient(
    STREAK_LENGTH - mid,
    mid,
    0,
    STREAK_LENGTH - mid,
    mid,
    mid,
  )

  head.addColorStop(0, `rgba(${rgb}, 1)`)
  head.addColorStop(1, `rgba(${rgb}, 0)`)
  context.fillStyle = head
  context.fillRect(STREAK_LENGTH - mid * 2, 0, mid * 2, STREAK_THICKNESS)

  return streak
}

export function buildStreaks(colors: ParticleColors): ParticleStreaks {
  return {
    ink: buildStreak(colors.ink),
    muted: buildStreak(colors.muted),
  }
}

export function drawFrame(
  context: CanvasRenderingContext2D,
  scene: FrameScene,
): void {
  const {
    particles,
    dust,
    sprites,
    streaks,
    width,
    height,
    elapsed,
    reduced,
    scan,
    dustTrails,
    particleScale,
  } = scene

  context.clearRect(0, 0, width, height)

  const drift = reduced ? 0 : DRIFT_DISTANCE * particleScale
  const driftX = Math.cos(DRIFT_ANGLE) * drift
  const driftY = -Math.sin(DRIFT_ANGLE) * drift
  const scanX =
    reduced || !scan
      ? Number.NEGATIVE_INFINITY
      : -SCAN_BAND +
        ((elapsed % SCAN_PERIOD_SECONDS) / SCAN_PERIOD_SECONDS) *
          (width + SCAN_BAND * 2)

  // Dust first: it is background texture and must never sit on top of the
  // glyphs it drifts away from.
  if (!reduced && dustTrails) {
    for (const mote of dust) {
      const remaining = Math.max(0, mote.life / mote.maxLife)

      if (remaining < 0.02) {
        continue
      }

      const alpha = remaining * 0.55
      const speed = Math.hypot(mote.vx, mote.vy)
      const core = Math.max(0.9, mote.size * 1.1 * particleScale)

      if (speed > 0.001) {
        const length = Math.max(2, speed * DUST_TRAIL_SECONDS * particleScale)
        const thickness = Math.max(1.2, mote.size * 1.6 * particleScale)

        // One rotated gradient streak per mote instead of a chain of sprites:
        // a chain leaves visible gaps at long trail lengths, which reads as
        // scratches rather than drifting dust.
        context.save()
        context.translate(mote.x, mote.y)
        context.rotate(Math.atan2(mote.vy, mote.vx))
        context.globalAlpha = alpha * 0.6
        context.drawImage(
          streaks[mote.tone],
          -length,
          -thickness / 2,
          length,
          thickness,
        )
        context.restore()
      }

      // Dimmer than the name particles on purpose, so the dust never outshines
      // the glyphs.
      context.globalAlpha = alpha
      context.drawImage(
        sprites[mote.tone],
        mote.x - core,
        mote.y - core,
        core * 2,
        core * 2,
      )
      context.globalAlpha = 1
    }
  }

  for (const particle of particles) {
    // Neighbours share a phase so the formation breathes as one body. A random
    // per-particle phase jitters dots off a 2px grid, which shreds small type.
    const sway = Math.sin(
      elapsed * 0.8 + (particle.targetX + particle.targetY) * 0.012,
    )
    const x = particle.x + driftX * sway
    const y = particle.y + driftY * sway
    const size = particle.size * particleScale

    context.drawImage(
      sprites[particle.tone],
      x - size,
      y - size,
      size * 2,
      size * 2,
    )

    if (reduced || !scan) {
      continue
    }

    const scanDistance = Math.abs(x - scanX)

    if (scanDistance < SCAN_BAND) {
      const glow = size * 1.9
      context.globalAlpha = (1 - scanDistance / SCAN_BAND) * 0.85
      context.drawImage(sprites.accent, x - glow, y - glow, glow * 2, glow * 2)
      context.globalAlpha = 1
    }
  }
}
