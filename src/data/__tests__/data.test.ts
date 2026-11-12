import { describe, expect, it } from 'vitest'
import { navItems } from '@/data/navigation'
import { pageMeta } from '@/data/pages'
import { profile } from '@/data/profile'
import { featuredProjects, projects } from '@/data/projects'

describe('profile', () => {
  it('exposes usable contact and identity fields', () => {
    expect(profile.name.length).toBeGreaterThan(0)
    expect(profile.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    expect(profile.socials.some((social) => social.id === 'email')).toBe(true)
  })

  it('links every social entry to a real protocol', () => {
    expect(
      profile.socials.every(
        (social) => social.href.startsWith('https://') || social.href.startsWith('mailto:'),
      ),
    ).toBe(true)
  })

  it('groups the stack without empty groups', () => {
    expect(profile.stack.length).toBeGreaterThan(0)
    expect(profile.stack.every((group) => group.title.length > 0 && group.items.length > 0)).toBe(
      true,
    )
  })
})

describe('navigation', () => {
  it('defines unique primary routes that all have page metadata', () => {
    const paths = navItems.map((item) => item.to)

    expect(new Set(paths).size).toBe(paths.length)

    const pagePaths = Object.values(pageMeta).map((page) => page.path)

    for (const path of paths) {
      expect(pagePaths).toContain(path)
    }
  })

  it('indexes nav items in ascending order', () => {
    expect(navItems.map((item) => item.index)).toEqual(
      navItems.map((_, index) => String(index + 1).padStart(2, '0')),
    )
  })
})

describe('projects', () => {
  it('uses unique slugs and non-empty copy', () => {
    expect(new Set(projects.map((project) => project.slug)).size).toBe(projects.length)
    expect(
      projects.every(
        (project) =>
          project.summary.length > 0 && project.stack.length > 0 && project.year.length === 4,
      ),
    ).toBe(true)
  })

  it('keeps the featured selection in sync with the project list', () => {
    expect(featuredProjects).toEqual(projects.filter((project) => project.featured))
    expect(featuredProjects.length).toBeGreaterThan(0)
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
