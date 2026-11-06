import { CrosshairCursor } from '../ui/crosshair-cursor'
import TargetCursor from '../ui/target-cursor'
import { useAppearance } from './appearance-context'

interface CursorLayerProps {
  targetSelector: string
}

export function CursorLayer({ targetSelector }: CursorLayerProps) {
  const { cursorStyle } = useAppearance()

  switch (cursorStyle) {
    case 'crosshair':
      return <CrosshairCursor />
    case 'target':
      return <TargetCursor parallaxOn={false} targetSelector={targetSelector} />
    default:
      return null
  }
}
