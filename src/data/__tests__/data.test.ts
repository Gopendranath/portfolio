import { describe, expect, it } from 'vitest'
import { navItems } from '../navigation'
import { profile } from '../profile'
import { projects } from '../projects'

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

  it('lists the Java and Spring stack', () => {
    expect(
      profile.stack.find((group) => group.title === 'Java & Spring')?.items,
    ).toEqual([
      'Java',
      'Spring Boot',
      'Spring AI',
      'Spring Data JPA',
      'Spring Security',
      'Hibernate',
      'Maven',
      'JUnit',
    ])
  })

  it('lists databases as a separate stack group', () => {
    expect(
      profile.stack.find((group) => group.title === 'Databases')?.items,
    ).toEqual([
      'PostgreSQL',
      'MySQL',
      'SQLite',
      'MongoDB',
      'Firebase',
      'Supabase',
      'Redis',
      'Vector DB',
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

  it('links I-hate-NPM to the Chrome Web Store', () => {
    const project = projects.find(
      (candidate) => candidate.slug === 'i-hate-npm',
    )

    expect(project?.links).toContainEqual({
      label: 'Chrome Web Store',
      href: 'https://chromewebstore.google.com/detail/i-hate-npm/mknigjikipkdnnpeifcgmckobgpbklej',
    })
    expect(project?.summary).toContain('deno')
    expect(project?.summary).toContain('bit')
  })
})
