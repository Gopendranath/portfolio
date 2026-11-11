import {
  type DustParticle,
  type Particle,
  type PointTarget,
  type PointerForce,
  createDust,
  createParticles,
  fitParticles,
  particleBudget,
  particlesSettled,
  stepDust,
  stepParticles,
} from '../../../lib/particle-name'
import {
  type FrameScene,
  type ParticleSprites,
  type ParticleStreaks,
  buildSprites,
  buildStreaks,
  drawFrame,
  readParticleColors,
} from './draw'
import { clampDpr, dustBudget, particleScaleForFontSize } from './metrics'
import {
  type EnvironmentObserverCallbacks,
  observeEnvironment,
  prefersReducedMotion,
} from './observers'
import { type PointerPoint, createPointerTracker } from './pointer-tracking'
import { sampleTextTargets } from './sample'

const SPAWN_PADDING = 24
const POINTER_RADIUS = 90
const POINTER_STRENGTH = 4600
const INTERACTIVE_WINDOW_SECONDS = 1.6
const INTERACTIVE_FRAME_MS = 1000 / 60
const AMBIENT_FRAME_MS = 1000 / 30

export interface ParticleBehavior {
  scan: boolean
  dust: boolean
  hover: boolean
}

export interface ParticleCanvasEngineOptions {
  heading: HTMLHeadingElement
  canvas: HTMLCanvasElement
  context: CanvasRenderingContext2D
  /** Read through a function so preference toggles apply without a restart. */
  readBehavior: () => ParticleBehavior
  onActiveChange: (active: boolean) => void
}

export interface ParticleCanvasEngine {
  destroy: () => void
}

/**
 * Owns the canvas simulation for the hero name: glyph sampling, particle
 * springs, dust drift, the frame loop, and every DOM observer it depends on.
 * Kept outside React so the component only manages mount, preferences, and
 * teardown.
 */
export function createParticleCanvasEngine({
  heading,
  canvas,
  context,
  readBehavior,
  onActiveChange,
}: ParticleCanvasEngineOptions): ParticleCanvasEngine {
  const canvasElement = canvas
  const headingElement = heading
  const ctx = context
  let reduced = prefersReducedMotion()
  let particles: Particle[] = []
  let dust: DustParticle[] = []
  let dustTargets: PointTarget[] = []
  let colors = readParticleColors()
  let sprites: ParticleSprites = buildSprites(colors)
  let streaks: ParticleStreaks = buildStreaks(colors)
  let particleScale = 1
  let width = 1
  let height = 1
  let sampledWidth = 0
  let sampledHeight = 0
  let sampledDpr = 0
  let sampledScale = 0
  let dpr = clampDpr(window.devicePixelRatio)
  let elapsed = 0
  let interactiveUntil = 0
  let settling = false
  let lastRender = 0
  let animationFrame = 0
  let running = false
  let onScreen = true
  let documentVisible = !document.hidden
  let cancelled = false
  let fontsReady = false
  let activated = false
  let pointer: PointerForce | null = null
  let pointerClient: PointerPoint | null = null

  const scene: FrameScene = {
    particles,
    dust,
    sprites,
    streaks,
    width,
    height,
    elapsed,
    reduced,
    scan: readBehavior().scan,
    dustTrails: readBehavior().dust,
    particleScale,
  }

  const notifyActive = (active: boolean) => onActiveChange(active)

  const deactivate = () => {
    activated = false
    notifyActive(false)
  }

  function measureHeading() {
    const rect = headingElement.getBoundingClientRect()
    width = Math.max(1, rect.width)
    height = Math.max(1, rect.height)
  }

  function measureParticleScale() {
    const span = headingElement.querySelector<HTMLElement>(
      '[data-particle-line]',
    )
    const fontSize = span
      ? Number.parseFloat(window.getComputedStyle(span).fontSize) || 16
      : 16

    return particleScaleForFontSize(fontSize)
  }

  function sizeCanvas() {
    const nextWidth = Math.max(1, Math.round(width * dpr))
    const nextHeight = Math.max(1, Math.round(height * dpr))

    if (
      canvasElement.width !== nextWidth ||
      canvasElement.height !== nextHeight
    ) {
      canvasElement.width = nextWidth
      canvasElement.height = nextHeight
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  function settleParticles() {
    for (const particle of particles) {
      particle.x = particle.targetX
      particle.y = particle.targetY
      particle.vx = 0
      particle.vy = 0
    }
  }

  function randomDust(): DustParticle {
    return createDust(
      dustTargets[Math.floor(Math.random() * dustTargets.length)],
    )
  }

  function currentDustTotal(): number {
    return dustBudget({
      particleCount: particles.length,
      particleScale,
      width,
    })
  }

  function syncDust() {
    if (reduced || !readBehavior().dust || dustTargets.length === 0) {
      dust = []
      return
    }

    const total = currentDustTotal()

    if (dust.length > total) {
      dust.length = total
    }

    while (dust.length < total) {
      dust.push(randomDust())
    }
  }

  function recycleDust() {
    if (dustTargets.length === 0) {
      return
    }

    for (let index = 0; index < dust.length; index += 1) {
      if (dust[index].life <= 0) {
        dust[index] = randomDust()
      }
    }
  }

  function draw() {
    scene.particles = particles
    scene.dust = dust
    scene.sprites = sprites
    scene.streaks = streaks
    scene.width = width
    scene.height = height
    scene.elapsed = elapsed
    scene.reduced = reduced
    scene.scan = readBehavior().scan
    scene.dustTrails = readBehavior().dust
    scene.particleScale = particleScale
    drawFrame(ctx, scene)
  }

  function activate() {
    if (!activated) {
      activated = true
      notifyActive(true)
    }
  }

  function paintStatic() {
    settleParticles()
    settling = false
    draw()
    activate()
  }

  function frame(now: number) {
    if (!running) {
      return
    }

    const behavior = readBehavior()
    const interacting =
      pointerClient !== null ||
      pointer !== null ||
      settling ||
      elapsed < interactiveUntil
    const interval = interacting ? INTERACTIVE_FRAME_MS : AMBIENT_FRAME_MS

    if (lastRender !== 0 && now - lastRender < interval - 0.5) {
      animationFrame = window.requestAnimationFrame(frame)
      return
    }

    const delta = lastRender === 0 ? 0 : (now - lastRender) / 1000
    lastRender = now
    elapsed += delta

    if (!behavior.hover && (pointer !== null || pointerClient !== null)) {
      pointer = null
      pointerClient = null
      settling = true
    }

    if (behavior.hover && pointerClient) {
      // Read the live rect so layout shifts above the heading (images, fonts,
      // banners) do not leave the repulsion field offset.
      const rect = headingElement.getBoundingClientRect()
      pointer = {
        x: pointerClient.x - rect.left,
        y: pointerClient.y - rect.top,
        radius: POINTER_RADIUS,
        strength: POINTER_STRENGTH,
      }
    }

    if (settling || pointer || elapsed < interactiveUntil) {
      stepParticles(
        particles,
        delta,
        elapsed,
        behavior.hover ? (pointer ?? undefined) : undefined,
      )

      // The simulation stops when the formation has actually converged, not
      // when a timer runs out. A dropped frame therefore delays the finish
      // instead of freezing particles halfway to their targets.
      if (settling && !pointer && particlesSettled(particles)) {
        settleParticles()
        settling = false
      }
    }

    if (behavior.dust && !reduced) {
      if (dust.length === 0) {
        syncDust()
      }

      stepDust(dust, delta)
      recycleDust()
    }

    draw()
    activate()
    animationFrame = window.requestAnimationFrame(frame)
  }

  function start() {
    if (
      running ||
      reduced ||
      !onScreen ||
      !documentVisible ||
      particles.length === 0
    ) {
      return
    }

    running = true
    lastRender = 0
    animationFrame = window.requestAnimationFrame(frame)
  }

  function stop() {
    running = false
    window.cancelAnimationFrame(animationFrame)
  }

  function syncRunning() {
    if (reduced || !onScreen || !documentVisible) {
      stop()
      return
    }

    start()
  }

  function resample(force = false) {
    if (cancelled || !fontsReady) {
      return
    }

    measureHeading()
    particleScale = measureParticleScale()

    if (
      !force &&
      particles.length > 0 &&
      width === sampledWidth &&
      height === sampledHeight &&
      dpr === sampledDpr &&
      particleScale === sampledScale
    ) {
      return
    }

    sampledWidth = width
    sampledHeight = height
    sampledDpr = dpr
    sampledScale = particleScale
    sizeCanvas()

    const targets = sampleTextTargets(
      headingElement,
      particleBudget(width, height, dpr),
    )

    if (targets.length === 0) {
      deactivate()
      return
    }

    if (particles.length === 0) {
      particles = createParticles(targets, {
        width,
        height,
        padding: SPAWN_PADDING,
      })
    } else {
      particles = fitParticles(particles, targets, {
        width,
        height,
        padding: SPAWN_PADDING,
      })
    }

    dustTargets = targets
    syncDust()

    interactiveUntil = elapsed + INTERACTIVE_WINDOW_SECONDS
    settling = true

    if (reduced) {
      paintStatic()
      return
    }

    syncRunning()
  }

  async function setup() {
    try {
      await document.fonts?.ready
    } catch {
      // Font loading is best-effort; sampling falls back to the loaded face.
    }

    if (cancelled) {
      return
    }

    fontsReady = true
    resample(true)
  }

  function updateColors() {
    colors = readParticleColors()
    sprites = buildSprites(colors)
    streaks = buildStreaks(colors)
    draw()
  }

  const themeObserver = new MutationObserver(updateColors)
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'data-accent'],
  })

  const observerCallbacks: EnvironmentObserverCallbacks = {
    onResize: () => resample(),
    onMotionChange: (isReduced) => {
      reduced = isReduced

      if (reduced) {
        stop()
        dust = []
        paintStatic()
        return
      }

      syncDust()
      syncRunning()
    },
    onVisibilityChange: (visible) => {
      documentVisible = visible
      syncRunning()
    },
    onIntersectionChange: (isOnScreen) => {
      onScreen = isOnScreen
      syncRunning()
    },
    onDprChange: () => {
      dpr = clampDpr(window.devicePixelRatio)
      resample(true)
    },
  }

  const disconnectObservers = observeEnvironment(
    headingElement,
    observerCallbacks,
  )

  const destroyPointerTracker = createPointerTracker({
    heading: headingElement,
    isEnabled: () => readBehavior().hover,
    onMove: (point) => {
      pointerClient = point
    },
    onRelease: () => {
      pointerClient = null
      pointer = null
      settling = true
    },
  })

  void setup()

  return {
    destroy: () => {
      cancelled = true
      running = false
      window.cancelAnimationFrame(animationFrame)
      themeObserver.disconnect()
      disconnectObservers()
      destroyPointerTracker()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvasElement.width, canvasElement.height)
    },
  }
}
