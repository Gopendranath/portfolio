import { useEffect, type RefObject } from 'react'
import {
  type DustParticle,
  type Particle,
  type PointTarget,
  type PointerForce,
  createDust,
  createParticles,
  retargetParticles,
  stepDust,
  stepParticles,
} from '../../../lib/particle-name'
import {
  type ParticleSprites,
  buildSprites,
  drawFrame,
  readParticleColors,
} from './draw'
import { sampleTextTargets } from './sample'

const SPAWN_PADDING = 24
const POINTER_RADIUS = 90
const POINTER_STRENGTH = 4600
const DUST_RATIO = 0.2
const MAX_DUST = 480

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

function currentDpr(): number {
  return Math.min(window.devicePixelRatio || 1, 2)
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
  useEffect(() => {
    if (!supported || !enabled || lineKey.length === 0) {
      return undefined
    }

    onActiveChange(false)

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
    let width = 1
    let height = 1
    let dpr = currentDpr()
    let elapsed = 0
    let lastTime = 0
    let animationFrame = 0
    let resizeFrame = 0
    let running = false
    let onScreen = true
    let documentVisible = !document.hidden
    let cancelled = false
    let fontsReady = false
    let activated = false
    let pointer: PointerForce | null = null
    let pointerClient: { x: number; y: number } | null = null
    let dprQuery: MediaQueryList | null = null

    function sizeCanvas() {
      const rect = headingElement.getBoundingClientRect()
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      canvasElement.width = Math.max(1, Math.round(width * dpr))
      canvasElement.height = Math.max(1, Math.round(height * dpr))
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

    function spawnDust(pointCount: number) {
      if (reduced || !dustEnabled || dustTargets.length === 0) {
        return
      }

      const total = Math.min(
        MAX_DUST,
        Math.max(1, Math.round(pointCount * DUST_RATIO)),
      )

      dust = Array.from({ length: total }, () =>
        createDust(dustTargets[Math.floor(Math.random() * dustTargets.length)]),
      )
    }

    function recycleDust() {
      if (dustTargets.length === 0) {
        return
      }

      for (let index = 0; index < dust.length; index += 1) {
        if (dust[index].life <= 0) {
          dust[index] = createDust(
            dustTargets[Math.floor(Math.random() * dustTargets.length)],
          )
        }
      }
    }

    function draw() {
      drawFrame(ctx, {
        particles,
        dust,
        sprites,
        colors,
        width,
        height,
        elapsed,
        reduced,
        scan,
        dustTrails: dustEnabled,
      })
    }

    function activate() {
      if (!activated) {
        activated = true
        onActiveChange(true)
      }
    }

    function paintStatic() {
      settleParticles()
      draw()
      activate()
    }

    function frame(now: number) {
      if (!running) {
        return
      }

      const delta = lastTime === 0 ? 0 : (now - lastTime) / 1000
      lastTime = now
      elapsed += delta

      if (hover && pointerClient) {
        const rect = headingElement.getBoundingClientRect()
        pointer = {
          x: pointerClient.x - rect.left,
          y: pointerClient.y - rect.top,
          radius: POINTER_RADIUS,
          strength: POINTER_STRENGTH,
        }
      }

      stepParticles(
        particles,
        delta,
        elapsed,
        hover ? (pointer ?? undefined) : undefined,
      )

      if (dustEnabled) {
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
      lastTime = 0
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

    function resample() {
      if (cancelled || !fontsReady) {
        return
      }

      sizeCanvas()
      const targets = sampleTextTargets(headingElement)

      if (targets.length === 0) {
        onActiveChange(false)
        return
      }

      if (particles.length === 0) {
        particles = createParticles(targets, {
          width,
          height,
          padding: SPAWN_PADDING,
        })
      } else {
        retargetParticles(particles, targets)
      }

      dustTargets = targets

      if (dust.length === 0) {
        spawnDust(particles.length)
      }

      if (reduced) {
        paintStatic()
      }
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
      resample()

      if (reduced) {
        paintStatic()
        return
      }

      start()
    }

    function updateColors() {
      colors = readParticleColors()
      sprites = buildSprites(colors)

      if (reduced) {
        draw()
      }
    }

    const onDprChange = () => {
      dpr = currentDpr()
      resample()
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
        paintStatic()
        return
      }

      syncRunning()
    }

    const onVisibilityChange = () => {
      documentVisible = !document.hidden
      syncRunning()
    }

    const onPointerMove = (event: PointerEvent) => {
      if (
        !hover ||
        (event.pointerType !== 'mouse' && event.pointerType !== 'pen')
      ) {
        return
      }

      pointerClient = { x: event.clientX, y: event.clientY }
    }

    const onPointerLeave = () => {
      pointerClient = null
      pointer = null
    }

    const themeObserver = new MutationObserver(updateColors)
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    const resizeObserver = new ResizeObserver(() => {
      window.cancelAnimationFrame(resizeFrame)
      resizeFrame = window.requestAnimationFrame(() => {
        resample()
      })
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
    headingElement.addEventListener('pointermove', onPointerMove, {
      passive: true,
    })
    headingElement.addEventListener('pointerleave', onPointerLeave)
    watchDpr()
    void setup()

    return () => {
      cancelled = true
      running = false
      window.cancelAnimationFrame(animationFrame)
      window.cancelAnimationFrame(resizeFrame)
      themeObserver.disconnect()
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      dprQuery?.removeEventListener('change', onDprChange)
      motionQuery.removeEventListener('change', onMotionChange)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      headingElement.removeEventListener('pointermove', onPointerMove)
      headingElement.removeEventListener('pointerleave', onPointerLeave)
      ctx.clearRect(0, 0, canvasElement.width, canvasElement.height)
    }
  }, [
    canvasRef,
    dustEnabled,
    enabled,
    headingRef,
    hover,
    lineKey,
    onActiveChange,
    scan,
    supported,
  ])
}
