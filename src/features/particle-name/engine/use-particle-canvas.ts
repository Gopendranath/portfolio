import { type RefObject, useEffect, useRef } from 'react'
import { createParticleCanvasEngine } from './particle-canvas'

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

/**
 * React glue for the hero name canvas: keeps live preferences in refs so the
 * engine never restarts for a toggle, and creates one engine per mounted
 * heading. All simulation and DOM observation lives in the engine.
 */
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

    const engine = createParticleCanvasEngine({
      heading,
      canvas,
      context,
      readBehavior: () => behaviorRef.current,
      onActiveChange: (active) => onActiveChangeRef.current(active),
    })

    return () => engine.destroy()
  }, [canvasRef, enabled, headingRef, lineKey, supported])
}
