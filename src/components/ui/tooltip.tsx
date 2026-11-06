import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

interface TooltipContextValue {
  describedBy?: string
}

const TooltipContext = createContext<TooltipContextValue | null>(null)

export type TooltipPlacement =
  | 'top'
  | 'top-left'
  | 'top-right'
  | 'right'
  | 'bottom'
  | 'bottom-left'
  | 'bottom-right'
  | 'left'

interface TooltipProps {
  label: string
  placement?: TooltipPlacement
  className?: string
  children: ReactNode
}

interface TooltipPosition {
  left: number
  top: number
  placement: TooltipPlacement
}

const TOOLTIP_GAP = 8
const TOOLTIP_ESTIMATED_WIDTH = 140
const TOOLTIP_ESTIMATED_HEIGHT = 32

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function resolvePlacement(
  rect: DOMRect,
  preferred: TooltipPlacement,
): TooltipPlacement {
  if (
    preferred === 'right' &&
    rect.right + TOOLTIP_GAP + TOOLTIP_ESTIMATED_WIDTH > window.innerWidth
  ) {
    return 'left'
  }

  if (
    preferred === 'left' &&
    rect.left - TOOLTIP_GAP - TOOLTIP_ESTIMATED_WIDTH < 0
  ) {
    return 'right'
  }

  if (preferred === 'top' && rect.top < 56) {
    return 'bottom'
  }

  if (preferred === 'top-left' && rect.top < 56) {
    return 'bottom-left'
  }

  if (preferred === 'top-right' && rect.top < 56) {
    return 'bottom-right'
  }

  if (
    preferred === 'bottom' &&
    rect.bottom + TOOLTIP_GAP + TOOLTIP_ESTIMATED_HEIGHT > window.innerHeight
  ) {
    return 'top'
  }

  if (
    preferred === 'bottom-left' &&
    rect.bottom + TOOLTIP_GAP + TOOLTIP_ESTIMATED_HEIGHT > window.innerHeight
  ) {
    return 'top-left'
  }

  if (
    preferred === 'bottom-right' &&
    rect.bottom + TOOLTIP_GAP + TOOLTIP_ESTIMATED_HEIGHT > window.innerHeight
  ) {
    return 'top-right'
  }

  return preferred
}

const placementClasses: Record<TooltipPlacement, string> = {
  top: '-translate-x-1/2 -translate-y-full',
  'top-left': '-translate-y-full',
  'top-right': '-translate-x-full -translate-y-full',
  bottom: '-translate-x-1/2',
  'bottom-left': '',
  'bottom-right': '-translate-x-full',
  right: '-translate-y-1/2',
  left: '-translate-x-full -translate-y-1/2',
}

export function Tooltip({
  label,
  placement = 'top',
  className = '',
  children,
}: TooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<TooltipPosition | null>(null)
  const tooltipId = useId()

  const open = useCallback(() => {
    const trigger = triggerRef.current

    if (!trigger) {
      return
    }

    const rect = trigger.getBoundingClientRect()
    const resolvedPlacement = resolvePlacement(rect, placement)
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const isTop =
      resolvedPlacement === 'top' ||
      resolvedPlacement === 'top-left' ||
      resolvedPlacement === 'top-right'
    const isBottom =
      resolvedPlacement === 'bottom' ||
      resolvedPlacement === 'bottom-left' ||
      resolvedPlacement === 'bottom-right'

    let left = centerX
    let top = rect.top - TOOLTIP_GAP

    if (isBottom) {
      top = rect.bottom + TOOLTIP_GAP
    }

    if (
      resolvedPlacement === 'top-left' ||
      resolvedPlacement === 'bottom-left'
    ) {
      left = rect.left
    } else if (
      resolvedPlacement === 'top-right' ||
      resolvedPlacement === 'bottom-right'
    ) {
      left = rect.right
    } else if (resolvedPlacement === 'right') {
      left = rect.right + TOOLTIP_GAP
      top = centerY
    } else if (resolvedPlacement === 'left') {
      left = rect.left - TOOLTIP_GAP
      top = centerY
    }

    if (isTop || isBottom) {
      const isCorner =
        resolvedPlacement.endsWith('left') ||
        resolvedPlacement.endsWith('right')

      left = clamp(
        left,
        isCorner ? 8 : 60,
        isCorner ? window.innerWidth - 8 : window.innerWidth - 60,
      )
    } else {
      top = clamp(top, 20, window.innerHeight - 20)
    }

    setPosition({ left, top, placement: resolvedPlacement })
    setIsOpen(true)
  }, [placement])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  useEffect(() => {
    const trigger = triggerRef.current

    if (!trigger) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close()
      }
    }

    trigger.addEventListener('mouseenter', open)
    trigger.addEventListener('mouseleave', close)
    trigger.addEventListener('focusin', open)
    trigger.addEventListener('focusout', close)
    trigger.addEventListener('click', close)
    trigger.addEventListener('keydown', handleKeyDown)

    return () => {
      trigger.removeEventListener('mouseenter', open)
      trigger.removeEventListener('mouseleave', close)
      trigger.removeEventListener('focusin', open)
      trigger.removeEventListener('focusout', close)
      trigger.removeEventListener('click', close)
      trigger.removeEventListener('keydown', handleKeyDown)
    }
  }, [close, open])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const hide = () => setIsOpen(false)

    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)

    return () => {
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
    }
  }, [isOpen])

  return (
    <TooltipContext.Provider
      value={{ describedBy: isOpen ? tooltipId : undefined }}
    >
      <span ref={triggerRef} className={`inline-flex ${className}`}>
        {children}
      </span>
      {isOpen && position
        ? createPortal(
            <div
              id={tooltipId}
              role="tooltip"
              style={{ left: position.left, top: position.top }}
              className={`pointer-events-none fixed z-[80] whitespace-nowrap border border-line bg-elevated px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink shadow-[0_4px_16px_rgb(0_0_0/0.35)] ${
                placementClasses[position.placement]
              }`}
            >
              {label}
            </div>,
            document.body,
          )
        : null}
    </TooltipContext.Provider>
  )
}

export function TooltipTrigger({
  'aria-describedby': describedBy,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const context = useContext(TooltipContext)
  const ids = [describedBy, context?.describedBy].filter(Boolean).join(' ')

  return <button {...props} aria-describedby={ids || undefined} />
}

export function TooltipLink({
  'aria-describedby': describedBy,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const context = useContext(TooltipContext)
  const ids = [describedBy, context?.describedBy].filter(Boolean).join(' ')

  return <a {...props} aria-describedby={ids || undefined} />
}
