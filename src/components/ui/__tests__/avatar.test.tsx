import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { Avatar } from '@/components/ui/avatar'

it('serves responsive optimized images with eager priority', () => {
  render(<Avatar alt="Gopendranath Sasmal" sizes="40px" priority />)

  const image = screen.getByRole('img', { name: 'Gopendranath Sasmal' })

  expect(image).toHaveAttribute('loading', 'eager')
  expect(image).toHaveAttribute('fetchpriority', 'high')
  expect(image).toHaveAttribute('decoding', 'async')
  expect(image.getAttribute('srcset')).toContain('160w')
  expect(image.getAttribute('srcset')).toContain('320w')
  expect(image.getAttribute('srcset')).toContain('460w')
  expect(image).toHaveAttribute('sizes', '40px')
})

it('lazy-loads decorative images by default', () => {
  const { container } = render(<Avatar />)
  const image = container.querySelector('img')

  expect(image).toHaveAttribute('loading', 'lazy')
  expect(image).toHaveAttribute('alt', '')
})
