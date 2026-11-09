import { useRef, useState } from 'react'
import { useParticleCanvas } from './use-particle-canvas'

interface ParticleNameLine {
  text: string
  muted?: boolean
}

interface ParticleNameProps {
  lines: readonly ParticleNameLine[]
  className?: string
  enabled?: boolean
  scan?: boolean
  dust?: boolean
  hover?: boolean
}

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

function lineClassName(active: boolean, muted: boolean): string {
  if (active) {
    return 'block text-transparent'
  }

  return muted ? 'block text-muted' : 'block'
}

export function ParticleName({
  lines,
  className,
  enabled = true,
  scan = true,
  dust = true,
  hover = true,
}: ParticleNameProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [supported] = useState(isCanvasSupported)
  const [active, setActive] = useState(false)
  const particleActive = enabled && active
  const lineKey = lines.map((line) => line.text).join('|')

  useParticleCanvas({
    headingRef,
    canvasRef,
    supported,
    enabled,
    scan,
    dust,
    hover,
    lineKey,
    onActiveChange: setActive,
  })

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
          className={lineClassName(particleActive, line.muted ?? false)}
        >
          {line.text}
        </span>
      ))}
      {supported && enabled ? (
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
