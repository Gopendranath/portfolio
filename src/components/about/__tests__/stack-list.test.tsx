import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { stackItemIcons } from '@/components/about/stack-icons'
import { StackList } from '@/components/about/stack-list'
import { profile } from '@/data/profile'

const allItems = profile.stack.flatMap((group) => group.items)

it('maps every profile stack item to a brand icon', () => {
  expect(allItems.filter((item) => !stackItemIcons[item])).toEqual([])
})

it('renders a coloured icon beside every stack item', () => {
  const { container } = render(<StackList items={allItems} />)

  expect(screen.getAllByRole('listitem')).toHaveLength(allItems.length)
  expect(container.querySelectorAll('li > svg')).toHaveLength(allItems.length)

  const javaIcon = screen.getByText('Java').closest('li')?.querySelector('svg')
  expect(javaIcon?.querySelector('path')).toHaveAttribute('fill', '#0074BD')
})
