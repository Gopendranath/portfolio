import { describe, expect, it } from 'vitest'
import {
  createDust,
  createParticles,
  fitParticles,
  parseColor,
  particlesSettled,
  retargetParticles,
  sampleStride,
  stepDust,
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
    expect(sampleStride(104)).toBe(2)
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
      expect(particle.size).toBeGreaterThanOrEqual(0.5)
      expect(particle.size).toBeLessThanOrEqual(1.2)
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

  it('converges in the same simulated time at 30 fps as at 60 fps', () => {
    const fast = seedParticle({ targetX: 320, targetY: 120, stiffness: 95 })
    const slow = seedParticle({ targetX: 320, targetY: 120, stiffness: 95 })

    for (let frame = 0; frame < 180; frame += 1) {
      stepParticles([fast], 1 / 60, frame / 60)
    }

    for (let frame = 0; frame < 90; frame += 1) {
      stepParticles([slow], 1 / 30, frame / 30)
    }

    expect(Math.abs(fast.x - slow.x)).toBeLessThan(1.5)
    expect(Math.abs(slow.x - 320)).toBeLessThan(5)
  })

  it('reports settled only once particles reach their targets', () => {
    const particle = seedParticle({ targetX: 100, targetY: 100 })

    expect(particlesSettled([particle])).toBe(false)

    particle.x = 100.2
    particle.y = 99.8
    expect(particlesSettled([particle])).toBe(true)

    particle.x = 120
    expect(particlesSettled([particle])).toBe(false)
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

describe('createDust', () => {
  it('starts on the glyph and heads north-east above the horizon', () => {
    const dust = createDust({ x: 10, y: 20, tone: 'ink' }, () => 0.5)

    expect(dust).toMatchObject({
      x: 10,
      y: 20,
      tone: 'ink',
    })
    expect(dust.vx).toBeGreaterThan(0)
    expect(dust.vy).toBeLessThan(0)
    expect(dust.maxLife).toBeGreaterThanOrEqual(2.25)
    expect(dust.maxLife).toBeLessThanOrEqual(4.5)
  })
})

describe('stepDust', () => {
  it('moves north-east and ages', () => {
    const dust = createDust({ x: 10, y: 20, tone: 'ink' }, () => 0.5)

    stepDust([dust], 1 / 60)

    expect(dust.x).toBeGreaterThan(10)
    expect(dust.y).toBeLessThan(20)
    expect(dust.life).toBeLessThan(dust.maxLife)
  })

  it('expires after its lifetime', () => {
    const dust = createDust({ x: 10, y: 20, tone: 'ink' }, () => 0.5)

    for (let frame = 0; frame < 300; frame += 1) {
      stepDust([dust], 1 / 60)
    }

    expect(dust.life).toBeLessThanOrEqual(0)
  })
})

describe('stepParticles pointer force', () => {
  it('pushes a particle away from the pointer', () => {
    const particle = seedParticle({ targetX: 10, targetY: 0 })
    particle.x = 10
    particle.y = 0

    stepParticles([particle], 1 / 60, 0, {
      x: 0,
      y: 0,
      radius: 100,
      strength: 3000,
    })

    expect(particle.x).toBeGreaterThan(10)
  })

  it('ignores particles outside the pointer radius', () => {
    const particle = seedParticle({ targetX: 300, targetY: 0 })
    particle.x = 300
    particle.y = 0

    stepParticles([particle], 1 / 60, 0, {
      x: 0,
      y: 0,
      radius: 100,
      strength: 3000,
    })

    expect(particle.x).toBe(300)
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

    expect(particles[0]).toMatchObject({
      targetX: 5,
      targetY: 6,
      tone: 'muted',
    })
    expect(particles[1]).toMatchObject({
      targetX: 7,
      targetY: 8,
      tone: 'ink',
    })
  })
})

describe('fitParticles', () => {
  const bounds = { width: 100, height: 100, padding: 0 }

  it('trims particles when the target count shrinks', () => {
    const particles = createParticles(
      [
        { x: 10, y: 10, tone: 'ink' as const },
        { x: 20, y: 20, tone: 'ink' as const },
        { x: 30, y: 30, tone: 'ink' as const },
      ],
      bounds,
      () => 0.5,
    )

    const fitted = fitParticles(
      particles,
      [
        { x: 5, y: 6, tone: 'muted' },
        { x: 7, y: 8, tone: 'ink' },
      ],
      bounds,
      () => 0.5,
    )

    expect(fitted).toHaveLength(2)
    expect(fitted[0]).toMatchObject({ targetX: 5, targetY: 6, tone: 'muted' })
    expect(fitted[1]).toMatchObject({ targetX: 7, targetY: 8, tone: 'ink' })
  })

  it('adds particles when the target count grows', () => {
    const particles = createParticles(
      [
        { x: 10, y: 10, tone: 'ink' as const },
        { x: 20, y: 20, tone: 'ink' as const },
      ],
      bounds,
      () => 0.5,
    )

    const fitted = fitParticles(
      particles,
      [
        { x: 5, y: 6, tone: 'muted' },
        { x: 7, y: 8, tone: 'ink' },
        { x: 9, y: 10, tone: 'ink' },
      ],
      bounds,
      () => 0.5,
    )

    expect(fitted).toHaveLength(3)
    expect(fitted[2]).toMatchObject({ targetX: 9, targetY: 10, tone: 'ink' })
  })

  it('keeps the particle count when the counts already match', () => {
    const particles = createParticles(
      [
        { x: 10, y: 10, tone: 'ink' as const },
        { x: 20, y: 20, tone: 'ink' as const },
      ],
      bounds,
      () => 0.5,
    )

    const fitted = fitParticles(
      particles,
      [
        { x: 5, y: 6, tone: 'muted' },
        { x: 7, y: 8, tone: 'ink' },
      ],
      bounds,
      () => 0.5,
    )

    expect(fitted).toBe(particles)
    expect(fitted).toHaveLength(2)
  })
})

function seedParticle(overrides: Partial<Particle>): Particle {
  const particle = createParticles(
    [{ x: 100, y: 100, tone: 'ink' }],
    { width: 100, height: 100, padding: 0 },
    () => 0.5,
  )[0]

  return { ...particle, x: 0, y: 0, vx: 0, vy: 0, delay: 0, ...overrides }
}
