import { profile } from '../../data/profile'
import type { SocialResult, WebMcpTool } from './tool'

export interface ProfileResult {
  name: string
  firstName: string
  lastName: string
  role: string
  location: string
  timezone: string
  bio: string
  about: string[]
  stack: Array<{ title: string; items: string[] }>
  socials: SocialResult[]
}

export interface AvailabilityResult {
  availability: string
  openToWork: boolean
  location: string
  timezone: string
  resumeAvailable: boolean
  note: string
}

export interface ContactResult {
  email: string
  mailto: string
  preferredChannel: 'email'
  location: string
  timezone: string
  socials: SocialResult[]
}

function contactSocials(): SocialResult[] {
  return profile.socials
    .filter((social) => social.id !== 'email')
    .map(({ label, href }) => ({ label, href }))
}

export function createGetProfileTool(): WebMcpTool<
  Record<string, never>,
  ProfileResult
> {
  return {
    name: 'get-profile',
    description:
      "Returns Gopendranath Sasmal's professional profile, including role, location, timezone, biography, technical stack, and social profiles. Use when the user asks who he is, what he does, or what technologies he works with.",
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    execute: () => ({
      name: profile.name,
      firstName: profile.firstName,
      lastName: profile.lastName,
      role: profile.role,
      location: profile.location,
      timezone: profile.timezone,
      bio: profile.bio,
      about: [...profile.about],
      stack: profile.stack.map(({ title, items }) => ({
        title,
        items: [...items],
      })),
      socials: contactSocials(),
    }),
  }
}

export function createCheckAvailabilityTool(): WebMcpTool<
  Record<string, never>,
  AvailabilityResult
> {
  return {
    name: 'check-availability',
    description:
      'Reports whether Gopendranath is currently open to work, along with location, timezone, and resume availability. Use when the user asks about hiring or availability.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    execute: () => ({
      availability: profile.availability,
      openToWork: profile.availability === 'Open to work',
      location: profile.location,
      timezone: profile.timezone,
      resumeAvailable: profile.resumeAvailable,
      note: profile.resumeAvailable
        ? ''
        : 'Resume is not published on this site.',
    }),
  }
}

export function createGetContactTool(): WebMcpTool<
  Record<string, never>,
  ContactResult
> {
  return {
    name: 'get-contact',
    description:
      "Returns Gopendranath's email, social profiles, location, and timezone. Use when the user asks how to contact him.",
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    execute: () => ({
      email: profile.email,
      mailto: `mailto:${profile.email}`,
      preferredChannel: 'email',
      location: profile.location,
      timezone: profile.timezone,
      socials: contactSocials(),
    }),
  }
}
