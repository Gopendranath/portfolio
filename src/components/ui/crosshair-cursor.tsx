import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export function CrosshairCursor() {
  const [host, setHost] = useState<HTMLElement | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')
    const update = () => setHost(finePointer.matches ? document.body : null)

    update()
    finePointer.addEventListener('change', update)
    return () => finePointer.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const root = rootRef.current
    if (!host || !root) return undefined

    const style = document.createElement('style')
    style.textContent = 'html, html * { cursor: none !important; }'
    document.head.append(style)

    const show = () => {
      root.style.opacity = '1'
    }

    const hide = () => {
      root.style.opacity = '0'
    }

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType && event.pointerType !== 'mouse') return

      root.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`
      show()
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', hide)
    window.addEventListener('blur', hide)

    return () => {
      style.remove()
      window.removeEventListener('pointermove', onPointerMove)
      document.documentElement.removeEventListener('pointerleave', hide)
      window.removeEventListener('blur', hide)
    }
  }, [host])

  if (!host) return null

  return createPortal(
    <div
      ref={rootRef}
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-[2147483647] text-ink opacity-0"
    >
      <svg
        width="25"
        height="25"
        viewBox="0 0 25 25"
        fill="none"
        className="absolute -translate-x-1/2 -translate-y-1/2"
        aria-hidden="true"
      >
        <path
          d="M12.5 1v6M12.5 18v6M1 12.5h6M18 12.5h6"
          stroke="currentColor"
          strokeWidth="1"
        />
        <circle cx="12.5" cy="12.5" r="1" fill="currentColor" />
      </svg>
    </div>,
    host,
  )
}
