import { projects } from '../../data/projects'
import type { ProjectResult, WebMcpTool } from './tool'

export interface ListProjectsInput {
  technology?: string
  featuredOnly?: boolean
}

export type ListProjectsResult =
  | { count: number; projects: ProjectResult[] }
  | { error: string; expected: string }
  | {
      count: 0
      projects: ProjectResult[]
      message: string
      availableTechnologies: string[]
    }

export interface GetProjectInput {
  slug: string
}

export type GetProjectResult =
  | ProjectResult
  | { error: string; expected: string }
  | { error: string; availableSlugs: string[] }

const projectResults: ProjectResult[] = projects.map((project) => ({
  slug: project.slug,
  title: project.title,
  year: project.year,
  summary: project.summary,
  stack: [...project.stack],
  links: project.links.map(({ label, href }) => ({ label, href })),
  featured: project.featured ?? false,
}))

const availableSlugs = projectResults.map(({ slug }) => slug)
const availableTechnologies = [
  ...new Set(projectResults.flatMap(({ stack }) => stack)),
].sort((left, right) => left.localeCompare(right))

function copyProject(project: ProjectResult): ProjectResult {
  return {
    ...project,
    stack: [...project.stack],
    links: project.links.map(({ label, href }) => ({ label, href })),
  }
}

export function createListProjectsTool(): WebMcpTool<
  ListProjectsInput,
  ListProjectsResult
> {
  return {
    name: 'list-projects',
    description:
      "Lists Gopendranath's portfolio projects with summaries, stacks, years, and links. Use when the user asks what he has built.",
    inputSchema: {
      type: 'object',
      properties: {
        technology: {
          type: 'string',
          description:
            'Technology to match against project stacks, such as React, Spring Boot, or Supabase.',
        },
        featuredOnly: {
          type: 'boolean',
          default: false,
          description: 'Return only projects marked as featured.',
        },
      },
    },
    annotations: { readOnlyHint: true },
    execute: (input) => {
      const technology = input?.technology
      const rawFeaturedOnly = input?.featuredOnly
      const featuredOnly =
        rawFeaturedOnly === undefined ? false : rawFeaturedOnly

      if (technology !== undefined && typeof technology !== 'string') {
        return {
          error: 'technology must be a string.',
          expected: 'technology: string',
        }
      }

      if (typeof featuredOnly !== 'boolean') {
        return {
          error: 'featuredOnly must be a boolean.',
          expected: 'featuredOnly: boolean',
        }
      }

      const trimmedTechnology = technology?.trim() ?? ''
      const query = trimmedTechnology.toLowerCase()
      const filtered = projectResults.filter((project) => {
        if (featuredOnly && !project.featured) return false
        if (query === '') return true

        return project.stack.some((entry) =>
          entry.toLowerCase().includes(query),
        )
      })

      if (filtered.length === 0) {
        return {
          count: 0,
          projects: [],
          message: trimmedTechnology
            ? `No projects match "${trimmedTechnology}".`
            : 'No projects match.',
          availableTechnologies: [...availableTechnologies],
        }
      }

      return {
        count: filtered.length,
        projects: filtered.map(copyProject),
      }
    },
  }
}

export function createGetProjectTool(): WebMcpTool<
  GetProjectInput,
  GetProjectResult
> {
  return {
    name: 'get-project',
    description:
      'Returns one portfolio project with its summary, stack, year, and links. Use when the user asks about a specific project.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          enum: [...availableSlugs],
          description: 'Project slug returned by list-projects.',
        },
      },
      required: ['slug'],
    },
    annotations: { readOnlyHint: true },
    execute: (input) => {
      const value = input?.slug

      if (typeof value !== 'string' || value.trim() === '') {
        return {
          error: 'Pass a project slug.',
          expected: 'slug: string',
        }
      }

      const query = value.trim().toLowerCase()
      const project =
        projectResults.find(({ slug }) => slug.toLowerCase() === query) ??
        projectResults.find(({ title }) => title.toLowerCase() === query)

      if (!project) {
        return {
          error: `Project "${value}" not found.`,
          availableSlugs: [...availableSlugs],
        }
      }

      return copyProject(project)
    },
  }
}
