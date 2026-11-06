import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildScrambledText } from '../../../lib/scramble'
import { ScrambleText } from '../scramble-text'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('buildScrambledText', () => {
  it('returns the full text once every character is revealed', () => {
    expect(buildScrambledText('FULL STACK', 20)).toBe('FULL STACK')
  })

  it('preserves spaces and length before reveal', () => {
    const scrambled = buildScrambledText('FULL STACK', 0, () => 0)

    expect(scrambled).toHaveLength(10)
    expect(scrambled[4]).toBe(' ')
    expect(scrambled).toBe('AAAA AAAAA')
  })
})

describe('ScrambleText', () => {
  it('settles on the final text after the animation', () => {
    vi.useFakeTimers()
    const { container } = render(<ScrambleText text="FULL STACK" />)
    const animated = container.querySelector('[data-scramble]')

    expect(animated).not.toBeNull()
    expect(animated?.textContent).not.toBe('FULL STACK')
    expect(animated?.textContent).toHaveLength(10)
    act(() => vi.advanceTimersByTime(2000))
    expect(animated).toHaveTextContent('FULL STACK')
  })

  it('replays the animation when a mouse hovers the text', () => {
    vi.useFakeTimers()
    const { container } = render(
      <ScrambleText text="FULL STACK" animateOnHover />,
    )
    const wrapper = container.firstElementChild as HTMLElement

    act(() => vi.advanceTimersByTime(2000))
    expect(container.querySelector('[data-scramble]')).toHaveTextContent(
      'FULL STACK',
    )

    fireEvent.pointerEnter(wrapper, { pointerType: 'mouse' })
    expect(container.querySelector('[data-scramble]')).not.toHaveTextContent(
      'FULL STACK',
    )

    act(() => vi.advanceTimersByTime(2000))
    expect(container.querySelector('[data-scramble]')).toHaveTextContent(
      'FULL STACK',
    )
  })

  it('skips the animation when reduced motion is requested', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    )

    const { container } = render(<ScrambleText text="FULL STACK" />)
    const animated = container.querySelector('[data-scramble]')

    expect(animated).toHaveTextContent('FULL STACK')
    expect(
      screen.getByText('FULL STACK', { selector: '.sr-only' }),
    ).toBeInTheDocument()
  })
})
