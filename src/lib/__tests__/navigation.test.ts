import { describe, expect, it } from 'vitest'
import { isNavItemActive } from '../navigation'

describe('isNavItemActive', () => {
  it('matches the home route exactly', () => {
    expect(isNavItemActive('/', '/')).toBe(true)
    expect(isNavItemActive('/projects', '/')).toBe(false)
  })

  it('matches exact and nested routes', () => {
    expect(isNavItemActive('/projects', '/projects')).toBe(true)
    expect(isNavItemActive('/projects/one', '/projects')).toBe(true)
    expect(isNavItemActive('/about', '/projects')).toBe(false)
  })

  it('does not match a shared prefix', () => {
    expect(isNavItemActive('/projects-archive', '/projects')).toBe(false)
  })
})
