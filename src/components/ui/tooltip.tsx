import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface TooltipContextValue {
  describedBy?: string
}

const TooltipContext = createContext<TooltipContextValue | null>(null)

interface TooltipProps {
  label: string
  children: ReactNode
}

interface TooltipPosition {
  left: number
  top: number
  placement: 'top' | 'bottom'
}

export function Tooltip({ label, children }: TooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<TooltipPosition | null>(null)
  const tooltipId = useId()

  function open() {
    const trigger = triggerRef.current

    if (!trigger) {
      return
    }

    const rect = trigger.getBoundingClientRect()
    const placement = rect.top < 56 ? 'bottom' : 'top'
    const halfWidth = 60

    setPosition({
      left: Math.min(
        Math.max(rect.left + rect.width / 2, halfWidth),
        window.innerWidth - halfWidth,
      ),
      top: placement === 'top' ? rect.top - 8 : rect.bottom + 8,
      placement,
    })
    setIsOpen(true)
  }

  function close() {
    setIsOpen(false)
  }

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
      <span
        ref={triggerRef}
        className="inline-flex"
        onMouseEnter={open}
        onMouseLeave={close}
        onFocus={open}
        onBlur={close}
        onClick={close}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            close()
          }
        }}
      >
        {children}
      </span>
      {isOpen && position
        ? createPortal(
            <div
              id={tooltipId}
              role="tooltip"
              style={{ left: position.left, top: position.top }}
              className={`pointer-events-none fixed z-[80] -translate-x-1/2 whitespace-nowrap border border-line bg-elevated px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink shadow-[0_4px_16px_rgb(0_0_0/0.35)] ${
                position.placement === 'top' ? '-translate-y-full' : ''
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
