export type TooltipPlacement =
  | 'top'
  | 'top-left'
  | 'top-right'
  | 'right'
  | 'bottom'
  | 'bottom-left'
  | 'bottom-right'
  | 'left'

export interface TooltipPosition {
  left: number
  top: number
  placement: TooltipPlacement
}

export interface TooltipViewport {
  width: number
  height: number
}

const TOOLTIP_GAP = 8
const TOOLTIP_ESTIMATED_WIDTH = 140
const TOOLTIP_ESTIMATED_HEIGHT = 32
const VIEWPORT_EDGE = 8
const VIEWPORT_EDGE_WIDE = 60
const VIEWPORT_VERTICAL_EDGE = 20
const TOP_BAR_CLEARANCE = 56

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function resolvePlacement(
  rect: DOMRect,
  preferred: TooltipPlacement,
  viewport: TooltipViewport,
): TooltipPlacement {
  const overflowsRight = rect.right + TOOLTIP_GAP + TOOLTIP_ESTIMATED_WIDTH > viewport.width
  const overflowsBottom = rect.bottom + TOOLTIP_GAP + TOOLTIP_ESTIMATED_HEIGHT > viewport.height

  switch (preferred) {
    case 'right':
      return overflowsRight ? 'left' : preferred
    case 'left':
      return rect.left - TOOLTIP_GAP - TOOLTIP_ESTIMATED_WIDTH < 0 ? 'right' : preferred
    case 'top':
      return rect.top < TOP_BAR_CLEARANCE ? 'bottom' : preferred
    case 'top-left':
      return rect.top < TOP_BAR_CLEARANCE ? 'bottom-left' : preferred
    case 'top-right':
      return rect.top < TOP_BAR_CLEARANCE ? 'bottom-right' : preferred
    case 'bottom':
      return overflowsBottom ? 'top' : preferred
    case 'bottom-left':
      return overflowsBottom ? 'top-left' : preferred
    case 'bottom-right':
      return overflowsBottom ? 'top-right' : preferred
    default:
      return preferred
  }
}

/**
 * Places a tooltip against its trigger, flipping the preferred side when the
 * viewport would clip it and nudging the result back inside the edges.
 */
export function resolveTooltipPosition(
  rect: DOMRect,
  preferred: TooltipPlacement,
  viewport: TooltipViewport,
): TooltipPosition {
  const placement = resolvePlacement(rect, preferred, viewport)
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  const isTop = placement === 'top' || placement === 'top-left' || placement === 'top-right'
  const isBottom =
    placement === 'bottom' || placement === 'bottom-left' || placement === 'bottom-right'

  let left = centerX
  let top = rect.top - TOOLTIP_GAP

  if (isBottom) {
    top = rect.bottom + TOOLTIP_GAP
  }

  if (placement === 'top-left' || placement === 'bottom-left') {
    left = rect.left
  } else if (placement === 'top-right' || placement === 'bottom-right') {
    left = rect.right
  } else if (placement === 'right') {
    left = rect.right + TOOLTIP_GAP
    top = centerY
  } else if (placement === 'left') {
    left = rect.left - TOOLTIP_GAP
    top = centerY
  }

  if (isTop || isBottom) {
    const isCorner = placement.endsWith('left') || placement.endsWith('right')

    left = clamp(
      left,
      isCorner ? VIEWPORT_EDGE : VIEWPORT_EDGE_WIDE,
      isCorner ? viewport.width - VIEWPORT_EDGE : viewport.width - VIEWPORT_EDGE_WIDE,
    )
  } else {
    top = clamp(top, VIEWPORT_VERTICAL_EDGE, viewport.height - VIEWPORT_VERTICAL_EDGE)
  }

  return { left, top, placement }
}

export const placementClasses: Record<TooltipPlacement, string> = {
  top: '-translate-x-1/2 -translate-y-full',
  'top-left': '-translate-y-full',
  'top-right': '-translate-x-full -translate-y-full',
  bottom: '-translate-x-1/2',
  'bottom-left': '',
  'bottom-right': '-translate-x-full',
  right: '-translate-y-1/2',
  left: '-translate-x-full -translate-y-1/2',
}
