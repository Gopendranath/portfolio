import { describe, expect, it } from 'vitest'
import {
  createGetProjectTool,
  createListProjectsTool,
} from './project-tools'
import type { GetProjectInput } from './project-tools'

const options = { signal: new AbortController().signal }
const allSlugs = [
  'movie-app-web',
  'product-management',
  'terminal-web-vm',
  'rag-pdf-chat',
  'i-hate-npm',
  'walmart-v1',
]

describe('list-projects', () => {
  it('returns all projects with normalized featured flags', () => {
    const result = createListProjectsTool().execute({}, options)
    if (!('projects' in result)) throw new Error('Expected a project list')

    expect(result.count).toBe(6)
    expect(result.projects.map(({ slug }) => slug)).toEqual(allSlugs)
    expect(result.projects.map(({ featured }) => featured)).toEqual([
      true,
      false,
      true,
      true,
      false,
      false,
    ])
    expect(result.projects[0]).toMatchObject({
      title: 'Movie-app-web',
      year: '2026',
      stack: ['React 19', 'TypeScript', 'Tailwind v4', 'Supabase', 'OMDB'],
      links: [
        { label: 'Live', href: 'https://movie-web9834.netlify.app' },
        {
          label: 'Code',
          href: 'https://github.com/Gopendranath/Movie-app-web',
        },
      ],
    })
  })

  it('returns all projects when input is missing', () => {
    const result = createListProjectsTool().execute(undefined, options)
    if (!('projects' in result)) throw new Error('Expected a project list')

    expect(result.count).toBe(6)
  })

  it('filters featured projects', () => {
    const result = createListProjectsTool().execute(
      { featuredOnly: true },
      options,
    )
    if (!('projects' in result)) throw new Error('Expected a project list')

    expect(result.projects.map(({ slug }) => slug)).toEqual([
      'movie-app-web',
      'terminal-web-vm',
      'rag-pdf-chat',
    ])
  })

  it('matches technology case-insensitively and partially', () => {
    const result = createListProjectsTool().execute(
      { technology: '  ReAcT  ' },
      options,
    )
    if (!('projects' in result)) throw new Error('Expected a project list')

    expect(result.projects.map(({ slug }) => slug)).toEqual([
      'movie-app-web',
      'walmart-v1',
    ])
  })

  it('treats a blank technology filter as no filter', () => {
    const result = createListProjectsTool().execute(
      { technology: '   ' },
      options,
    )
    if (!('projects' in result)) throw new Error('Expected a project list')

    expect(result.count).toBe(6)
  })

  it('returns available technologies when nothing matches', () => {
    const result = createListProjectsTool().execute(
      { technology: 'spring boot' },
      options,
    )
    if (!('availableTechnologies' in result)) {
      throw new Error('Expected an empty result with technologies')
    }

    expect(result.count).toBe(0)
    expect(result.projects).toEqual([])
    expect(result.message).toBe('No projects match "spring boot".')
    expect(result.availableTechnologies).toContain('React 19')
  })

  it('rejects non-string technology values', () => {
    expect(
      createListProjectsTool().execute(
        { technology: 42 as unknown as string },
        options,
      ),
    ).toEqual({
      error: 'technology must be a string.',
      expected: 'technology: string',
    })
  })

  it('rejects non-boolean featuredOnly values', () => {
    expect(
      createListProjectsTool().execute(
        { featuredOnly: 'yes' as unknown as boolean },
        options,
      ),
    ).toEqual({
      error: 'featuredOnly must be a boolean.',
      expected: 'featuredOnly: boolean',
    })
  })

  it('rejects null featuredOnly values instead of defaulting them', () => {
    expect(
      createListProjectsTool().execute(
        { featuredOnly: null as unknown as boolean },
        options,
      ),
    ).toEqual({
      error: 'featuredOnly must be a boolean.',
      expected: 'featuredOnly: boolean',
    })
  })
})

describe('get-project', () => {
  it('resolves a slug case-insensitively', () => {
    const result = createGetProjectTool().execute(
      { slug: 'RAG-PDF-CHAT' },
      options,
    )

    expect(result).toMatchObject({
      slug: 'rag-pdf-chat',
      title: 'RAG PDF Chat',
      year: '2025',
    })
  })

  it('falls back to a display-title match', () => {
    const result = createGetProjectTool().execute(
      { slug: 'rag pdf chat' },
      options,
    )

    expect(result).toMatchObject({
      slug: 'rag-pdf-chat',
      title: 'RAG PDF Chat',
    })
  })

  it('rejects a missing or blank slug', () => {
    expect(createGetProjectTool().execute(undefined, options)).toEqual({
      error: 'Pass a project slug.',
      expected: 'slug: string',
    })
    expect(
      createGetProjectTool().execute({} as GetProjectInput, options),
    ).toEqual({
      error: 'Pass a project slug.',
      expected: 'slug: string',
    })
    expect(
      createGetProjectTool().execute({ slug: '   ' }, options),
    ).toEqual({
      error: 'Pass a project slug.',
      expected: 'slug: string',
    })
  })

  it('rejects a non-string slug', () => {
    expect(
      createGetProjectTool().execute(
        { slug: 42 as unknown as string },
        options,
      ),
    ).toEqual({
      error: 'Pass a project slug.',
      expected: 'slug: string',
    })
  })

  it('returns available slugs for an unknown project', () => {
    expect(
      createGetProjectTool().execute({ slug: 'nope' }, options),
    ).toEqual({
      error: 'Project "nope" not found.',
      availableSlugs: allSlugs,
    })
  })

  it('does not let callers mutate the published slug list', () => {
    const first = createGetProjectTool().execute({ slug: 'nope' }, options)
    if (!('availableSlugs' in first)) {
      throw new Error('Expected available slugs')
    }

    first.availableSlugs.push('injected')

    expect(
      createGetProjectTool().execute({ slug: 'nope' }, options),
    ).toEqual({
      error: 'Project "nope" not found.',
      availableSlugs: allSlugs,
    })
  })
})
