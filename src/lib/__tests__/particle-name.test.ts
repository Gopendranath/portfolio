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

function seedParticle(overrides: Partial<Particle>): Particle {
  const particle = createParticles(
    [{ x: 100, y: 100, tone: 'ink' }],
    { width: 100, height: 100, padding: 0 },
    () => 0.5,
  )[0]

  return { ...particle, x: 0, y: 0, vx: 0, vy: 0, delay: 0, ...overrides }
}
