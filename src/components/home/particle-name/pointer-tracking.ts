export interface PointerPoint {
  x: number
  y: number
}

export interface PointerTrackingOptions {
  heading: HTMLElement
  /** Live preference read; hover can be toggled without re-binding listeners. */
  isEnabled: () => boolean
  onMove: (point: PointerPoint) => void
  onRelease: () => void
}

/**
 * Binds the pointer listeners that feed the repulsion field. Mouse and pen
 * track continuously; touch only tracks the pointer that started on the
 * heading, so a scroll gesture elsewhere never drags the cloud.
 */
export function createPointerTracker({
  heading,
  isEnabled,
  onMove,
  onRelease,
}: PointerTrackingOptions): () => void {
  let touchPointerId: number | null = null

  const onPointerDown = (event: PointerEvent) => {
    if (!isEnabled() || event.pointerType !== 'touch') {
      return
    }

    touchPointerId = event.pointerId
    onMove({ x: event.clientX, y: event.clientY })
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!isEnabled()) {
      return
    }

    if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
      onMove({ x: event.clientX, y: event.clientY })
      return
    }

    if (event.pointerType === 'touch' && event.pointerId === touchPointerId) {
      onMove({ x: event.clientX, y: event.clientY })
    }
  }

  const endTouch = (event: PointerEvent) => {
    if (event.pointerType !== 'touch' || event.pointerId !== touchPointerId) {
      return
    }

    touchPointerId = null
    onRelease()
  }

  const onPointerLeave = (event: PointerEvent) => {
    if (event.pointerType === 'touch') {
      return
    }

    onRelease()
  }

  heading.addEventListener('pointerdown', onPointerDown, { passive: true })
  heading.addEventListener('pointermove', onPointerMove, { passive: true })
  heading.addEventListener('pointerup', endTouch)
  heading.addEventListener('pointercancel', endTouch)
  heading.addEventListener('pointerleave', onPointerLeave)

  return () => {
    heading.removeEventListener('pointerdown', onPointerDown)
    heading.removeEventListener('pointermove', onPointerMove)
    heading.removeEventListener('pointerup', endTouch)
    heading.removeEventListener('pointercancel', endTouch)
    heading.removeEventListener('pointerleave', onPointerLeave)
  }
}
