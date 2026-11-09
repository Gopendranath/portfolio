import {
  type DustParticle,
  type Particle,
  type ParticleTone,
  type RgbColor,
  parseColor,
} from '../../../lib/particle-name'

const SPRITE_SIZE = 24
const DRIFT_ANGLE = Math.PI / 6
const DRIFT_DISTANCE = 2.5
const SCAN_PERIOD_SECONDS = 7
const SCAN_BAND = 80
const DUST_TRAIL_SECONDS = 0.28

type SpriteTone = ParticleTone | 'accent'

export interface ParticleColors {
  ink: RgbColor
  muted: RgbColor
  accent: RgbColor
}

export type ParticleSprites = Record<SpriteTone, HTMLCanvasElement>

export interface FrameScene {
  particles: Particle[]
  dust: DustParticle[]
  sprites: ParticleSprites
  colors: ParticleColors
  width: number
  height: number
  elapsed: number
  reduced: boolean
  scan: boolean
  dustTrails: boolean
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

export function drawFrame(
  context: CanvasRenderingContext2D,
  scene: FrameScene,
): void {
  const {
    particles,
    dust,
    sprites,
    colors,
    width,
    height,
    elapsed,
    reduced,
    scan,
    dustTrails,
  } = scene

  context.clearRect(0, 0, width, height)

  const drift = reduced ? 0 : DRIFT_DISTANCE
  const driftX = Math.cos(DRIFT_ANGLE) * drift
  const driftY = -Math.sin(DRIFT_ANGLE) * drift
  const scanX =
    reduced || !scan
      ? Number.NEGATIVE_INFINITY
      : -SCAN_BAND +
        ((elapsed % SCAN_PERIOD_SECONDS) / SCAN_PERIOD_SECONDS) *
          (width + SCAN_BAND * 2)

  for (const particle of particles) {
    const sway = Math.sin(elapsed * 0.8 + particle.phase)
    const x = particle.x + driftX * sway
    const y = particle.y + driftY * sway
    const size = particle.size

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

  if (reduced || !dustTrails) {
    return
  }

  for (const mote of dust) {
    const remaining = Math.max(0, mote.life / mote.maxLife)
    const alpha = remaining * 0.8
    const color = colors[mote.tone]

    context.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.45})`
    context.lineWidth = Math.max(0.6, mote.size * 0.8)
    context.beginPath()
    context.moveTo(
      mote.x - mote.vx * DUST_TRAIL_SECONDS,
      mote.y - mote.vy * DUST_TRAIL_SECONDS,
    )
    context.lineTo(mote.x, mote.y)
    context.stroke()

    context.globalAlpha = alpha
    context.drawImage(
      sprites[mote.tone],
      mote.x - mote.size,
      mote.y - mote.size,
      mote.size * 2,
      mote.size * 2,
    )
    context.globalAlpha = 1
  }
}
