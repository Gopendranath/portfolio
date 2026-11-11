import { useEffect, useRef } from 'react'
import avatar460 from '@/assets/avatar/avatar-460.webp'
import { mountPortraitRipple } from './scene/portrait-scene'

interface PortraitRippleCanvasProps {
  onReady?: () => void
  onUnavailable?: () => void
}

export default function PortraitRippleCanvas({
  onReady,
  onUnavailable,
}: PortraitRippleCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current

    if (!host) {
      return
    }

    try {
      const ripple = mountPortraitRipple(host, avatar460, {
        onReady,
        onUnavailable,
      })
      return () => ripple.dispose()
    } catch {
      // WebGL can fail after construction; the static avatar stays visible.
      onUnavailable?.()
      return undefined
    }
  }, [onReady, onUnavailable])

  return <div ref={hostRef} className="absolute inset-0" />
}
