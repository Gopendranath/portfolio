import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Avatar } from '@/components/ui/avatar'
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion'
import { RippleBoundary } from './ripple-boundary'

const RippleCanvas = lazy(() => import('./portrait-ripple-canvas'))

interface PortraitRippleProps {
  alt: string
  className?: string
}

/**
 * Probe result is cached and the probe context released, because a browser
 * only keeps a handful of live WebGL contexts and this runs on every mount.
 */
let webglSupport: boolean | null = null

function supportsWebgl() {
  if (webglSupport !== null) {
    return webglSupport
  }

  try {
    const probe = document.createElement('canvas')
    const context = probe.getContext('webgl2') ?? probe.getContext('webgl')
    webglSupport = Boolean(context)
    context?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    webglSupport = false
  }

  return webglSupport
}

export function PortraitRipple({ alt, className = '' }: PortraitRippleProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [webgl] = useState(supportsWebgl)
  const reducedMotion = usePrefersReducedMotion()
  const [inView, setInView] = useState(false)
  const [canvasReady, setCanvasReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const active = inView && webgl && !reducedMotion && !failed
  const showCanvas = active && canvasReady
  const handleReady = useCallback(() => setCanvasReady(true), [])
  const handleUnavailable = useCallback(() => setFailed(true), [])

  useEffect(() => {
    const host = hostRef.current

    if (!host || !webgl || reducedMotion) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(host)

    return () => observer.disconnect()
  }, [webgl, reducedMotion])

  return (
    <div
      ref={hostRef}
      className={`cursor-target relative aspect-square w-full max-w-[320px] overflow-hidden border border-line bg-canvas ${className}`}
    >
      <Avatar
        alt={alt}
        className={`size-full transition-opacity duration-300 ${
          showCanvas ? 'opacity-0' : 'opacity-100'
        }`}
        sizes="320px"
      />
      {active ? (
        <RippleBoundary onError={handleUnavailable}>
          <Suspense fallback={null}>
            <RippleCanvas
              onReady={handleReady}
              onUnavailable={handleUnavailable}
            />
          </Suspense>
        </RippleBoundary>
      ) : null}
    </div>
  )
}
