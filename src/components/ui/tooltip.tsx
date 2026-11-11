import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from 'react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

interface TooltipContextValue {
  describedBy?: string
}

const TooltipContext = createContext<TooltipContextValue | null>(null)

import {
  placementClasses,
  resolveTooltipPosition,
  type TooltipPlacement,
  type TooltipPosition,
} from './tooltip-position'

export type { TooltipPlacement } from './tooltip-position'

interface TooltipProps {
  label: string
  placement?: TooltipPlacement
  className?: string
  children: ReactNode
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

    setPosition(
      resolveTooltipPosition(trigger.getBoundingClientRect(), placement, {
        width: window.innerWidth,
        height: window.innerHeight,
      }),
    )
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
