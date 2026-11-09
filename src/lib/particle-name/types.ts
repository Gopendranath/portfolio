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

export interface DustParticle {
  x: number
  y: number
  previousX: number
  previousY: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  tone: ParticleTone
}

export interface PointerForce {
  x: number
  y: number
  radius: number
  strength: number
}
