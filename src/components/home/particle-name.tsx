import { useEffect, useRef, useState } from 'react'
import {
  type Particle,
  type ParticleTone,
  type PointTarget,
  type RgbColor,
  createParticles,
  parseColor,
  retargetParticles,
  sampleStride,
  stepParticles,
} from '../../lib/particle-name'
import {
  MAX_POINTS,
  collectTargets,
  thinTargets,
} from '../../lib/particle-name-sampling'

const SPRITE_SIZE = 24
const SPAWN_PADDING = 24
const IDLE_AMPLITUDE = 0.5

interface ParticleNameLine {
  text: string
  muted?: boolean
}

interface ParticleNameProps {
  lines: readonly ParticleNameLine[]
  className?: string
}

interface ParticleColors {
  ink: RgbColor
  muted: RgbColor
}

type ParticleSprites = Record<ParticleTone, HTMLCanvasElement>

function isCanvasSupported(): boolean {
  if (typeof document === 'undefined') {
    return false
  }

  try {
    return document.createElement('canvas').getContext('2d') !== null
  } catch {
    return false
  }
}

function readColors(): ParticleColors {
  const style = window.getComputedStyle(document.documentElement)
  const ink = parseColor(style.getPropertyValue('--color-ink')) ?? {
    r: 255,
    g: 255,
    b: 255,
  }

  return {
    ink,
    muted: parseColor(style.getPropertyValue('--color-muted')) ?? ink,
  }
}

function buildSprite(color: RgbColor): HTMLCanvasElement {
  const sprite = document.createElement('canvas')
  sprite.width = SPRITE_SIZE
  sprite.height = SPRITE_SIZE
  const context = sprite.getContext('2d')
  const center = SPRITE_SIZE / 2

  if (!context) {
    return sprite
  }

  const gradient = context.createRadialGradient(
    center,
    center,
    0,
    center,
    center,
    center,
  )
  const rgb = `${color.r}, ${color.g}, ${color.b}`

  gradient.addColorStop(0, `rgba(${rgb}, 1)`)
  gradient.addColorStop(0.55, `rgba(${rgb}, 0.85)`)
  gradient.addColorStop(1, `rgba(${rgb}, 0)`)
  context.fillStyle = gradient
  context.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE)

  return sprite
}

function buildSprites(colors: ParticleColors): ParticleSprites {
  return {
    ink: buildSprite(colors.ink),
    muted: buildSprite(colors.muted),
  }
}

function lineClassName(active: boolean, muted: boolean): string {
  if (active) {
    return 'block text-transparent'
  }

  return muted ? 'block text-muted' : 'block'
}

function currentDpr(): number {
  return Math.min(window.devicePixelRatio || 1, 2)
}

export function ParticleName({ lines, className }: ParticleNameProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [supported] = useState(isCanvasSupported)
  const [active, setActive] = useState(false)
  const lineKey = lines.map((line) => line.text).join('|')

  useEffect(() => {
    if (!supported || lineKey.length === 0) {
      return undefined
    }

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
    let colors = readColors()
    let sprites = buildSprites(colors)
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
    let dprQuery: MediaQueryList | null = null

    function sampleTargets(): PointTarget[] {
      const headingRect = headingElement.getBoundingClientRect()
      const targets: PointTarget[] = []

      for (const span of headingElement.querySelectorAll<HTMLElement>(
        '[data-particle-line]',
      )) {
        const rect = span.getBoundingClientRect()

        if (rect.width < 1 || rect.height < 1) {
          continue
        }

        const style = window.getComputedStyle(span)
        const fontSize = Number.parseFloat(style.fontSize) || 16
        const offscreen = document.createElement('canvas')
        offscreen.width = Math.max(1, Math.ceil(rect.width))
        offscreen.height = Math.max(1, Math.ceil(fontSize * 1.4))
        const offscreenContext = offscreen.getContext('2d')

        if (!offscreenContext) {
          continue
        }

        offscreenContext.font =
          `${style.fontStyle} ${style.fontWeight} ` +
          `${style.fontSize} ${style.fontFamily}`
        const spacedContext = offscreenContext as CanvasRenderingContext2D & {
          letterSpacing?: string
        }

        if ('letterSpacing' in spacedContext) {
          spacedContext.letterSpacing = style.letterSpacing
        }

        const text = span.textContent ?? ''
        const metrics = offscreenContext.measureText(text)
        const ascent = metrics.fontBoundingBoxAscent || fontSize * 0.8
        const descent = metrics.fontBoundingBoxDescent || fontSize * 0.2
        offscreenContext.textAlign = 'left'
        offscreenContext.textBaseline = 'alphabetic'
        offscreenContext.fillStyle = '#ffffff'
        offscreenContext.fillText(
          text,
          0,
          (offscreen.height + ascent - descent) / 2,
        )

        const image = offscreenContext.getImageData(
          0,
          0,
          offscreen.width,
          offscreen.height,
        )
        const tone: ParticleTone =
          span.dataset.tone === 'muted' ? 'muted' : 'ink'
        const offsetX = rect.left - headingRect.left
        const offsetY =
          rect.top - headingRect.top - (offscreen.height - rect.height) / 2

        for (const point of collectTargets(
          image,
          sampleStride(fontSize),
          tone,
        )) {
          targets.push({
            x: point.x + offsetX,
            y: point.y + offsetY,
            tone,
          })
        }
      }

      return thinTargets(targets, MAX_POINTS)
    }

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

    function drawParticles() {
      ctx.clearRect(0, 0, width, height)

      for (const particle of particles) {
        const drift = reduced ? 0 : IDLE_AMPLITUDE
        const x = particle.x + Math.sin(elapsed * 0.7 + particle.phase) * drift
        const y = particle.y + Math.cos(elapsed * 0.53 + particle.phase) * drift
        const size = particle.size

        ctx.drawImage(
          sprites[particle.tone],
          x - size,
          y - size,
          size * 2,
          size * 2,
        )
      }
    }

    function activate() {
      if (!activated) {
        activated = true
        setActive(true)
      }
    }

    function paintStatic() {
      settleParticles()
      drawParticles()
      activate()
    }

    function frame(now: number) {
      if (!running) {
        return
      }

      const delta = lastTime === 0 ? 0 : (now - lastTime) / 1000
      lastTime = now
      elapsed += delta
      stepParticles(particles, delta, elapsed)
      drawParticles()
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
      const targets = sampleTargets()

      if (targets.length === 0) {
        setActive(false)
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
      colors = readColors()
      sprites = buildSprites(colors)

      if (reduced) {
        drawParticles()
      }
    }

    function watchDpr() {
      dprQuery?.removeEventListener('change', onDprChange)
      dprQuery = window.matchMedia(
        `(resolution: ${window.devicePixelRatio}dppx)`,
      )
      dprQuery.addEventListener('change', onDprChange)
    }

    const onDprChange = () => {
      dpr = currentDpr()
      resample()
      watchDpr()
    }

    const onMotionChange = () => {
      reduced = motionQuery.matches

      if (reduced) {
        stop()
        settleParticles()
        drawParticles()
        return
      }

      syncRunning()
    }

    const onVisibilityChange = () => {
      documentVisible = !document.hidden
      syncRunning()
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
    watchDpr()
    void setup()

    return () => {
      cancelled = true
      stop()
      window.cancelAnimationFrame(resizeFrame)
      themeObserver.disconnect()
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      dprQuery?.removeEventListener('change', onDprChange)
      motionQuery.removeEventListener('change', onMotionChange)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      ctx.clearRect(0, 0, canvasElement.width, canvasElement.height)
    }
  }, [lineKey, supported])

  return (
    <h1
      ref={headingRef}
      aria-label={lines.map((line) => line.text).join(' ')}
      translate="no"
      className={`relative ${className ?? ''}`.trim()}
    >
      {lines.map((line) => (
        <span
          key={line.text}
          data-particle-line
          data-tone={line.muted ? 'muted' : 'ink'}
          className={lineClassName(active, line.muted ?? false)}
        >
          {line.text}
        </span>
      ))}
      {supported ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
        >
          <canvas ref={canvasRef} className="h-full w-full" />
        </div>
      ) : null}
    </h1>
  )
}
