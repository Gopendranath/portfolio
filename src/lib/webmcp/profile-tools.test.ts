import { describe, expect, it } from 'vitest'
import { profile } from '../../data/profile'
import {
  createCheckAvailabilityTool,
  createGetContactTool,
  createGetProfileTool,
} from './profile-tools'

const options = { signal: new AbortController().signal }

describe('get-profile', () => {
  it('returns the profile with non-email socials', () => {
    const result = createGetProfileTool().execute({}, options)

    expect(result.name).toBe('Gopendranath Sasmal')
    expect(result.firstName).toBe('Gopendranath')
    expect(result.lastName).toBe('Sasmal')
    expect(result.role).toBe('Full Stack Developer')
    expect(result.location).toBe('BTM Layout, Bengaluru, India')
    expect(result.timezone).toBe('IST (UTC+5:30)')
    expect(result.bio).toBe(profile.bio)
    expect(result.about).toEqual(profile.about)
    expect(result.stack).toEqual(
      profile.stack.map(({ title, items }) => ({ title, items })),
    )
    expect(result.socials).toEqual([
      { label: 'GitHub', href: 'https://github.com/Gopendranath' },
      { label: 'LinkedIn', href: 'https://linkedin.com/in/gns99' },
      { label: 'X', href: 'https://x.com/AssassinsEmper1' },
      { label: 't3rminal.vercel.app', href: 'https://t3rminal.vercel.app' },
    ])
  })

  it('ignores missing input', () => {
    const result = createGetProfileTool().execute(undefined, options)

    expect(result.name).toBe('Gopendranath Sasmal')
    expect(result.socials).toHaveLength(4)
  })
})

describe('check-availability', () => {
  it('reports availability, location, and resume status', () => {
    expect(createCheckAvailabilityTool().execute({}, options)).toEqual({
      availability: 'Open to work',
      openToWork: true,
      location: 'BTM Layout, Bengaluru, India',
      timezone: 'IST (UTC+5:30)',
      resumeAvailable: false,
      note: 'Resume is not published on this site.',
    })
  })

  it('reports availability when input is missing', () => {
    expect(createCheckAvailabilityTool().execute(undefined, options)).toEqual({
      availability: 'Open to work',
      openToWork: true,
      location: 'BTM Layout, Bengaluru, India',
      timezone: 'IST (UTC+5:30)',
      resumeAvailable: false,
      note: 'Resume is not published on this site.',
    })
  })
})

describe('get-contact', () => {
  it('returns email and non-email socials', () => {
    const result = createGetContactTool().execute({}, options)

    expect(result.email).toBe('gopendranathsasmal7@gmail.com')
    expect(result.mailto).toBe('mailto:gopendranathsasmal7@gmail.com')
    expect(result.preferredChannel).toBe('email')
    expect(result.location).toBe(profile.location)
    expect(result.timezone).toBe(profile.timezone)
    expect(result.socials.map(({ label }) => label)).toEqual([
      'GitHub',
      'LinkedIn',
      'X',
      't3rminal.vercel.app',
    ])
  })

  it('returns contact details when input is missing', () => {
    expect(createGetContactTool().execute(undefined, options).email).toBe(
      'gopendranathsasmal7@gmail.com',
    )
  })
})
