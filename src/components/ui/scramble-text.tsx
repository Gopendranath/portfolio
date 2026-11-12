import { type PointerEventHandler, useEffect, useState, useSyncExternalStore } from 'react'
import { buildScrambledText, initialScramble } from '@/lib/text/scramble'

const FRAME_MS = 28

function subscribeToReducedMotion(callback: () => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => undefined
  }

  const query = window.matchMedia('(prefers-reduced-motion: reduce)')
  query.addEventListener('change', callback)
  return () => query.removeEventListener('change', callback)
}

function getReducedMotionSnapshot() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

interface ScrambleTextProps {
  text: string
  className?: string
  animateOnHover?: boolean
}

function ScrambleMarkup({
  display,
  text,
  className,
  onPointerEnter,
}: {
  display: string
  text: string
  className: string
  onPointerEnter?: PointerEventHandler<HTMLSpanElement>
}) {
  return (
    <span className={className} onPointerEnter={onPointerEnter}>
      <span data-scramble aria-hidden="true">
        {display}
      </span>
      <span className="sr-only">{text}</span>
    </span>
  )
}

function AnimatedScramble({
  text,
  className,
  onPointerEnter,
}: {
  text: string
  className: string
  onPointerEnter?: PointerEventHandler<HTMLSpanElement>
}) {
  const [display, setDisplay] = useState(() => initialScramble(text))

  useEffect(() => {
    const characters = Array.from(text)
    let revealed = 0

    const interval = window.setInterval(() => {
      revealed += 1

      if (revealed >= characters.length) {
        setDisplay(text)
        window.clearInterval(interval)
        return
      }

      setDisplay(buildScrambledText(text, revealed))
    }, FRAME_MS)

    return () => window.clearInterval(interval)
  }, [text])

  return (
    <ScrambleMarkup
      display={display}
      text={text}
      className={className}
      onPointerEnter={onPointerEnter}
    />
  )
}

export function ScrambleText({ text, className = '', animateOnHover = false }: ScrambleTextProps) {
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    () => false,
  )
  const [replay, setReplay] = useState(0)

  const onPointerEnter: PointerEventHandler<HTMLSpanElement> | undefined =
    animateOnHover && !reducedMotion
      ? (event) => {
          if (event.pointerType === 'mouse') {
            setReplay((value) => value + 1)
          }
        }
      : undefined

  if (reducedMotion) {
    return <ScrambleMarkup display={text} text={text} className={className} />
  }

  return (
    <AnimatedScramble
      key={`${text}-${replay}`}
      text={text}
      className={className}
      onPointerEnter={onPointerEnter}
    />
  )
}
