import { useEffect, useState, useSyncExternalStore } from 'react'
import { buildScrambledText, initialScramble } from '../../lib/scramble'

const FRAME_MS = 28

function subscribeToReducedMotion(callback: () => void) {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return () => undefined
  }

  const query = window.matchMedia('(prefers-reduced-motion: reduce)')
  query.addEventListener('change', callback)
  return () => query.removeEventListener('change', callback)
}

function getReducedMotionSnapshot() {
  return typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

interface ScrambleTextProps {
  text: string
  className?: string
}

function ScrambleMarkup({
  display,
  text,
  className,
}: {
  display: string
  text: string
  className: string
}) {
  return (
    <span className={className}>
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
}: {
  text: string
  className: string
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
    <ScrambleMarkup display={display} text={text} className={className} />
  )
}

export function ScrambleText({ text, className = '' }: ScrambleTextProps) {
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    () => false,
  )

  if (reducedMotion) {
    return (
      <ScrambleMarkup display={text} text={text} className={className} />
    )
  }

  return <AnimatedScramble key={text} text={text} className={className} />
}
