import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import type { Project } from '../../../data/types'
import { ProjectCard } from '../project-card'

const project: Project = {
  slug: 'test-project',
  title: 'Test project with a deliberately long title for wrapping',
  year: '2026',
  summary: 'A short project summary for the card test.',
  stack: ['React', 'TypeScript', 'Tailwind CSS'],
  links: [
    { label: 'Live', href: 'https://example.com/live' },
    { label: 'Code', href: 'https://github.com/example/repo' },
  ],
}

it('renders the project and safe external links', () => {
  render(<ProjectCard project={project} index={1} />)

  expect(
    screen.getByRole('heading', {
      name: project.title,
      level: 3,
    }),
  ).toBeInTheDocument()
  expect(screen.getByText(project.summary)).toBeInTheDocument()
  expect(screen.getByText('01')).toBeInTheDocument()
  expect(screen.getByText('2026')).toBeInTheDocument()

  for (const technology of project.stack) {
    expect(screen.getByText(technology)).toBeInTheDocument()
  }

  const links = screen.getAllByRole('link')
  expect(links).toHaveLength(project.links.length)

  for (const link of links) {
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')).toContain('noreferrer')
    expect(link.getAttribute('rel')).toContain('noopener')
  }
})
