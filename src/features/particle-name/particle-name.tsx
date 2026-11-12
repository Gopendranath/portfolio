import { useRef, useState } from 'react'
import { useParticleCanvas } from './engine/use-particle-canvas'

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

function lineSignature(lines: readonly ParticleNameLine[]): string {
  return lines.map((line) => `${line.muted ? 'muted' : 'ink'}\u0000${line.text}`).join('\u0001')
}

function lineKeys(lines: readonly ParticleNameLine[]): string[] {
  const occurrences = new Map<string, number>()

  return lines.map((line) => {
    const signature = `${line.muted ? 'muted' : 'ink'}\u0000${line.text}`
    const count = occurrences.get(signature) ?? 0
    occurrences.set(signature, count + 1)

    return `${signature}\u0002${count}`
  })
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
  const lineKey = lineSignature(lines)
  const keys = lineKeys(lines)

  // Adjust state during render so re-enabling the cloud cannot paint one frame
  // with transparent text over an empty canvas.
  if (!enabled && active) {
    setActive(false)
  }

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
      {lines.map((line, index) => (
        <span
          key={keys[index]}
          aria-hidden="true"
          data-particle-line
          data-tone={line.muted ? 'muted' : 'ink'}
          className={lineClassName(particleActive, line.muted ?? false)}
        >
          {line.text}
        </span>
      ))}
      {supported && enabled ? (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 block">
          <canvas ref={canvasRef} className="h-full w-full" />
        </span>
      ) : null}
    </h1>
  )
}
