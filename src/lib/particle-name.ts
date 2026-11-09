export type ParticleTone = 'ink' | 'muted'

export interface PointTarget {
  x: number
  y: number
  tone: ParticleTone
}

export interface SpawnBounds {
  width: number
  height: number
  padding?: number
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  targetX: number
  targetY: number
  size: number
  phase: number
  stiffness: number
  delay: number
  tone: ParticleTone
}

export interface RgbColor {
  r: number
  g: number
  b: number
}

export interface PointerForce {
  x: number
  y: number
  radius: number
  strength: number
}

const FRICTION = 0.86
const MAX_STEP_SECONDS = 1 / 30

export function parseColor(value: string): RgbColor | null {
  const input = value.trim().toLowerCase()

  const shortHex = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(input)
  if (shortHex) {
    return {
      r: Number.parseInt(`${shortHex[1]}${shortHex[1]}`, 16),
      g: Number.parseInt(`${shortHex[2]}${shortHex[2]}`, 16),
      b: Number.parseInt(`${shortHex[3]}${shortHex[3]}`, 16),
    }
  }

  const longHex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/.exec(input)
  if (longHex) {
    return {
      r: Number.parseInt(longHex[1], 16),
      g: Number.parseInt(longHex[2], 16),
      b: Number.parseInt(longHex[3], 16),
    }
  }

  const rgb = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/.exec(input)
  if (rgb) {
    return {
      r: Number(rgb[1]),
      g: Number(rgb[2]),
      b: Number(rgb[3]),
    }
  }

  return null
}

export function sampleStride(fontSize: number): number {
  return Math.min(5, Math.max(2, Math.round(fontSize / 40)))
}

export function createParticles(
  targets: readonly PointTarget[],
  bounds: SpawnBounds,
  random: () => number = Math.random,
): Particle[] {
  const padding = bounds.padding ?? 0

  return targets.map((target) => ({
    x: -padding + random() * (bounds.width + padding * 2),
    y: -padding + random() * (bounds.height + padding * 2),
    vx: 0,
    vy: 0,
    targetX: target.x,
    targetY: target.y,
    size: 0.9 + random() * 1.3,
    phase: random() * Math.PI * 2,
    stiffness: 90 + random() * 50,
    delay: (target.x / bounds.width) * 0.25 + random() * 0.15,
    tone: target.tone,
  }))
}

export function retargetParticles(
  particles: Particle[],
  targets: readonly PointTarget[],
): void {
  if (targets.length === 0) {
    return
  }

  for (let index = 0; index < particles.length; index += 1) {
    const target = targets[index % targets.length]
    const particle = particles[index]

    particle.targetX = target.x
    particle.targetY = target.y
    particle.tone = target.tone
  }
}

export function stepParticles(
  particles: Particle[],
  deltaSeconds: number,
  elapsedSeconds: number,
  pointer?: PointerForce,
): void {
  const dt = Math.min(deltaSeconds, MAX_STEP_SECONDS)
  const radiusSq = pointer ? pointer.radius * pointer.radius : 0

  for (const particle of particles) {
    if (particle.delay > elapsedSeconds) {
      continue
    }

    particle.vx =
      (particle.vx +
        (particle.targetX - particle.x) * particle.stiffness * dt) *
      FRICTION
    particle.vy =
      (particle.vy +
        (particle.targetY - particle.y) * particle.stiffness * dt) *
      FRICTION

    if (pointer) {
      const dx = particle.x - pointer.x
      const dy = particle.y - pointer.y
      const distanceSq = dx * dx + dy * dy

      if (distanceSq < radiusSq && distanceSq > 0.01) {
        const distance = Math.sqrt(distanceSq)
        const push = pointer.strength * (1 - distance / pointer.radius) * dt
        particle.vx += (dx / distance) * push
        particle.vy += (dy / distance) * push
      }
    }

    particle.x += particle.vx * dt
    particle.y += particle.vy * dt
  }
}
