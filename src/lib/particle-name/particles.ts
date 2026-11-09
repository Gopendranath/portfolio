import type { Particle, PointTarget, PointerForce, SpawnBounds } from './types'

const FRICTION = 0.86
export const MAX_STEP_SECONDS = 1 / 30

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
