import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ParticleName } from '../particle-name'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ParticleName', () => {
  it('keeps the full name as the heading accessible name', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)

    render(
      <ParticleName
        lines={[{ text: 'Gopendranath' }, { text: 'Sasmal', muted: true }]}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'Gopendranath Sasmal' }),
    ).toBeInTheDocument()
  })

  it('renders plain text and no canvas when Canvas 2D is unavailable', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)

    const { container } = render(
      <ParticleName
        lines={[{ text: 'Gopendranath' }, { text: 'Sasmal', muted: true }]}
      />,
    )

    expect(container.querySelector('canvas')).toBeNull()
    expect(container.querySelector('span')).not.toHaveClass('text-transparent')
  })
})
