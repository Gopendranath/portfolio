import { Component, type ReactNode } from 'react'

interface RippleBoundaryProps {
  children: ReactNode
  onError: () => void
}

interface RippleBoundaryState {
  failed: boolean
}

export class RippleBoundary extends Component<RippleBoundaryProps, RippleBoundaryState> {
  override state: RippleBoundaryState = { failed: false }

  static getDerivedStateFromError(): RippleBoundaryState {
    return { failed: true }
  }

  override componentDidCatch() {
    this.props.onError()
  }

  override render() {
    return this.state.failed ? null : this.props.children
  }
}
