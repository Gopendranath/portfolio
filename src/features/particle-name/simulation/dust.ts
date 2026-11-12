import { MAX_STEP_SECONDS } from './particles'
import type { DustParticle, PointTarget } from './types'

const DUST_ANGLE = Math.PI / 6
const DUST_ANGLE_JITTER = 0.09
const DUST_MIN_SPEED = 15
const DUST_MAX_SPEED = 30
const DUST_MIN_LIFE = 2.25
const DUST_MAX_LIFE = 4.5

export function createDust(target: PointTarget, random: () => number = Math.random): DustParticle {
  const angle = DUST_ANGLE + (random() * 2 - 1) * DUST_ANGLE_JITTER
  const speed = DUST_MIN_SPEED + random() * (DUST_MAX_SPEED - DUST_MIN_SPEED)
  const life = DUST_MIN_LIFE + random() * (DUST_MAX_LIFE - DUST_MIN_LIFE)

  return {
    x: target.x,
    y: target.y,
    vx: Math.cos(angle) * speed,
    vy: -Math.sin(angle) * speed,
    life,
    maxLife: life,
    size: 0.7 + random() * 1.1,
    tone: target.tone,
  }
}

export function stepDust(dust: DustParticle[], deltaSeconds: number): void {
  const dt = Math.min(deltaSeconds, MAX_STEP_SECONDS)

  for (const mote of dust) {
    mote.x += mote.vx * dt
    mote.y += mote.vy * dt
    mote.life -= dt
  }
}
