import { describe, expect, it } from 'vitest'
import { navItems } from './navigation'
import { profile } from './profile'
import { projects } from './projects'

describe('profile', () => {
  it('contains the real contact details', () => {
    expect(profile.email).toBe('gopendranathsasmal7@gmail.com')
    expect(profile.availability).toBe('Open to work')
    expect(profile.resumeAvailable).toBe(false)
  })

  it('lists every public social link in display order', () => {
    expect(profile.socials.map((social) => social.id)).toEqual([
      'github',
      'linkedin',
      'x',
      'website',
      'email',
    ])
  })
})

describe('navigation', () => {
  it('defines the four primary routes in order', () => {
    expect(navItems.map((item) => item.label)).toEqual([
      'Home',
      'Projects',
      'About',
      'Contact',
    ])
  })
})

describe('projects', () => {
  it('contains six unique projects', () => {
    expect(projects).toHaveLength(6)
    expect(new Set(projects.map((project) => project.slug)).size).toBe(
      projects.length,
    )
  })

  it('features exactly three projects', () => {
    expect(projects.filter((project) => project.featured)).toHaveLength(3)
  })

  it('only exposes secure external links', () => {
    expect(
      projects.every(
        (project) =>
          project.links.length > 0 &&
          project.links.every((link) => link.href.startsWith('https://')),
      ),
    ).toBe(true)
  })
})
