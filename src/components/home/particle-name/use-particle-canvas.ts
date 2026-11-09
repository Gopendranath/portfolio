import { useEffect, useRef, type RefObject } from 'react'
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
import { sampleTextTargets } from './sample'

const SPAWN_PADDING = 24
const POINTER_RADIUS = 90
const POINTER_STRENGTH = 4600
const DUST_RATIO = 0.15
const MAX_DUST = 420
const DUST_REFERENCE_WIDTH = 900
const DUST_MIN_WIDTH_FACTOR = 0.45
const INTERACTIVE_WINDOW_SECONDS = 1.6
const INTERACTIVE_FRAME_MS = 1000 / 60
const AMBIENT_FRAME_MS = 1000 / 30
const RESIZE_DEBOUNCE_MS = 120
const MAX_DPR = 3

interface UseParticleCanvasOptions {
  headingRef: RefObject<HTMLHeadingElement | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  supported: boolean
  enabled: boolean
  scan: boolean
  dust: boolean
  hover: boolean
  lineKey: string
  onActiveChange: (active: boolean) => void
}

interface BehaviorOptions {
  scan: boolean
  dust: boolean
  hover: boolean
}

function currentDpr(): number {
  return Math.min(window.devicePixelRatio || 1, MAX_DPR)
}

export function useParticleCanvas({
  headingRef,
  canvasRef,
  supported,
  enabled,
  scan,
  dust: dustEnabled,
  hover,
  lineKey,
  onActiveChange,
}: UseParticleCanvasOptions): void {
  const behaviorRef = useRef<BehaviorOptions>({
    scan,
    dust: dustEnabled,
    hover,
  })
  const onActiveChangeRef = useRef(onActiveChange)

  useEffect(() => {
    behaviorRef.current = { scan, dust: dustEnabled, hover }
  }, [scan, dustEnabled, hover])

  useEffect(() => {
    onActiveChangeRef.current = onActiveChange
  }, [onActiveChange])

  useEffect(() => {
    if (!supported || !enabled || lineKey.length === 0) {
      onActiveChangeRef.current(false)
      return undefined
    }

    onActiveChangeRef.current(false)

    const heading = headingRef.current
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')

    if (!heading || !canvas || !context) {
      return undefined
    }

    const headingElement = heading
    const canvasElement = canvas
    const ctx = context
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    let reduced = motionQuery.matches
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
    let dpr = currentDpr()
    let elapsed = 0
    let interactiveUntil = 0
    let settling = false
    let lastRender = 0
    let animationFrame = 0
    let resizeTimer: ReturnType<typeof setTimeout> | undefined
    let running = false
    let onScreen = true
    let documentVisible = !document.hidden
    let cancelled = false
    let fontsReady = false
    let activated = false
    let pointer: PointerForce | null = null
    let pointerClient: { x: number; y: number } | null = null
    let touchPointerId: number | null = null
    let dprQuery: MediaQueryList | null = null

    const scene: FrameScene = {
      particles,
      dust,
      sprites,
      streaks,
      width,
      height,
      elapsed,
      reduced,
      scan: behaviorRef.current.scan,
      dustTrails: behaviorRef.current.dust,
      particleScale,
    }

    function notifyActive(active: boolean) {
      onActiveChangeRef.current(active)
    }

    function deactivate() {
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

      return Math.max(0.9, Math.min(1, fontSize / 96))
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

    function dustTotal(): number {
      const widthFactor = Math.min(
        1,
        Math.max(DUST_MIN_WIDTH_FACTOR, width / DUST_REFERENCE_WIDTH),
      )

      return Math.min(
        MAX_DUST,
        Math.max(
          1,
          Math.round(
            particles.length * DUST_RATIO * particleScale * widthFactor,
          ),
        ),
      )
    }

    function syncDust() {
      if (reduced || !behaviorRef.current.dust || dustTargets.length === 0) {
        dust = []
        return
      }

      const total = dustTotal()

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
      scene.scan = behaviorRef.current.scan
      scene.dustTrails = behaviorRef.current.dust
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

      const behavior = behaviorRef.current
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

    const onDprChange = () => {
      dpr = currentDpr()
      resample(true)
      watchDpr()
    }

    function watchDpr() {
      dprQuery?.removeEventListener('change', onDprChange)
      dprQuery = window.matchMedia(
        `(resolution: ${window.devicePixelRatio}dppx)`,
      )
      dprQuery.addEventListener('change', onDprChange)
    }

    const onMotionChange = () => {
      reduced = motionQuery.matches

      if (reduced) {
        stop()
        dust = []
        paintStatic()
        return
      }

      syncDust()
      syncRunning()
    }

    const onVisibilityChange = () => {
      documentVisible = !document.hidden
      syncRunning()
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!behaviorRef.current.hover || event.pointerType !== 'touch') {
        return
      }

      touchPointerId = event.pointerId
      pointerClient = { x: event.clientX, y: event.clientY }
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!behaviorRef.current.hover) {
        return
      }

      if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
        pointerClient = { x: event.clientX, y: event.clientY }
        return
      }

      if (event.pointerType === 'touch' && event.pointerId === touchPointerId) {
        pointerClient = { x: event.clientX, y: event.clientY }
      }
    }

    const endTouch = (event: PointerEvent) => {
      if (event.pointerType !== 'touch' || event.pointerId !== touchPointerId) {
        return
      }

      touchPointerId = null
      pointerClient = null
      pointer = null
      settling = true
    }

    const onPointerLeave = (event: PointerEvent) => {
      if (event.pointerType === 'touch') {
        return
      }

      pointerClient = null
      pointer = null
      settling = true
    }

    const themeObserver = new MutationObserver(updateColors)
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-accent'],
    })

    const resizeObserver = new ResizeObserver(() => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        resample()
      }, RESIZE_DEBOUNCE_MS)
    })
    resizeObserver.observe(headingElement)

    const intersectionObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        onScreen = entry.isIntersecting
      }
      syncRunning()
    })
    intersectionObserver.observe(headingElement)

    motionQuery.addEventListener('change', onMotionChange)
    document.addEventListener('visibilitychange', onVisibilityChange)
    headingElement.addEventListener('pointerdown', onPointerDown, {
      passive: true,
    })
    headingElement.addEventListener('pointermove', onPointerMove, {
      passive: true,
    })
    headingElement.addEventListener('pointerup', endTouch)
    headingElement.addEventListener('pointercancel', endTouch)
    headingElement.addEventListener('pointerleave', onPointerLeave)
    watchDpr()
    void setup()

    return () => {
      cancelled = true
      running = false
      window.cancelAnimationFrame(animationFrame)
      clearTimeout(resizeTimer)
      themeObserver.disconnect()
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      dprQuery?.removeEventListener('change', onDprChange)
      motionQuery.removeEventListener('change', onMotionChange)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      headingElement.removeEventListener('pointerdown', onPointerDown)
      headingElement.removeEventListener('pointermove', onPointerMove)
      headingElement.removeEventListener('pointerup', endTouch)
      headingElement.removeEventListener('pointercancel', endTouch)
      headingElement.removeEventListener('pointerleave', onPointerLeave)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvasElement.width, canvasElement.height)
    }
  }, [canvasRef, enabled, headingRef, lineKey, supported])
}
