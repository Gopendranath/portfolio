import type { Particle, PointTarget, PointerForce, SpawnBounds } from './types'

const FRICTION = 0.86
const REFERENCE_STEP_SECONDS = 1 / 60
const SETTLE_DISTANCE = 0.5
export const MAX_STEP_SECONDS = 1 / 30

function createParticle(
  target: PointTarget,
  bounds: SpawnBounds,
  random: () => number,
): Particle {
  const padding = bounds.padding ?? 0

  return {
    x: -padding + random() * (bounds.width + padding * 2),
    y: -padding + random() * (bounds.height + padding * 2),
    vx: 0,
    vy: 0,
    targetX: target.x,
    targetY: target.y,
    size: 0.5 + random() * 0.7,
    stiffness: 90 + random() * 50,
    delay: (target.x / bounds.width) * 0.25 + random() * 0.15,
    tone: target.tone,
  }
}

export function createParticles(
  targets: readonly PointTarget[],
  bounds: SpawnBounds,
  random: () => number = Math.random,
): Particle[] {
  return targets.map((target) => createParticle(target, bounds, random))
}

export function fitParticles(
  particles: Particle[],
  targets: readonly PointTarget[],
  bounds: SpawnBounds,
  random: () => number = Math.random,
): Particle[] {
  if (targets.length === 0) {
    return particles
  }

  if (particles.length > targets.length) {
    particles.length = targets.length
  } else if (particles.length < targets.length) {
    for (let index = particles.length; index < targets.length; index += 1) {
      particles.push(createParticle(targets[index], bounds, random))
    }
  }

  retargetParticles(particles, targets)
  return particles
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

/**
 * True once every particle is resting on its target. Callers use this to stop
 * simulating instead of stopping after an arbitrary time budget, so motion
 * always finishes no matter how many frames the browser drops.
 */
export function particlesSettled(
  particles: readonly Particle[],
  distance = SETTLE_DISTANCE,
): boolean {
  for (const particle of particles) {
    if (Math.abs(particle.targetX - particle.x) > distance) {
      return false
    }

    if (Math.abs(particle.targetY - particle.y) > distance) {
      return false
    }
  }

  return true
}

export function stepParticles(
  particles: Particle[],
  deltaSeconds: number,
  elapsedSeconds: number,
  pointer?: PointerForce,
): void {
  const total = Math.min(deltaSeconds, MAX_STEP_SECONDS)

  if (!(total > 0)) {
    return
  }

  // Split the frame into fixed-size substeps so the spring integrates the same
  // distance per second at 144 Hz and at 30 Hz, and damp with a per-second
  // decay derived from the reference frame rate.
  const substeps = Math.max(1, Math.ceil(total / REFERENCE_STEP_SECONDS))
  const dt = total / substeps
  const damping = FRICTION ** (dt / REFERENCE_STEP_SECONDS)
  const radiusSq = pointer ? pointer.radius * pointer.radius : 0

  for (let step = 0; step < substeps; step += 1) {
    const elapsed = elapsedSeconds + step * dt

    for (const particle of particles) {
      if (particle.delay > elapsed) {
        continue
      }

      particle.vx =
        (particle.vx +
          (particle.targetX - particle.x) * particle.stiffness * dt) *
        damping
      particle.vy =
        (particle.vy +
          (particle.targetY - particle.y) * particle.stiffness * dt) *
        damping

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
}
