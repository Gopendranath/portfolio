import { profile } from '@/data/profile'
import { projects } from '@/data/projects'
import type {
  AvailabilityResult,
  ContactResult,
  GetProjectInput,
  GetProjectResult,
  ListProjectsInput,
  ListProjectsResult,
  ProfileResult,
} from '@/lib/webmcp'
import {
  createCheckAvailabilityTool,
  createGetContactTool,
  createGetProfileTool,
  createGetProjectTool,
  createListProjectsTool,
  useWebMCP,
} from '@/lib/webmcp'

const getProfileTool = createGetProfileTool(profile)
const listProjectsTool = createListProjectsTool(projects)
const getProjectTool = createGetProjectTool(projects)
const checkAvailabilityTool = createCheckAvailabilityTool(profile)
const getContactTool = createGetContactTool(profile)

export function WebMcpTools() {
  useWebMCP<Record<string, never>, ProfileResult>(getProfileTool)
  useWebMCP<ListProjectsInput, ListProjectsResult>(listProjectsTool)
  useWebMCP<GetProjectInput, GetProjectResult>(getProjectTool)
  useWebMCP<Record<string, never>, AvailabilityResult>(checkAvailabilityTool)
  useWebMCP<Record<string, never>, ContactResult>(getContactTool)

  return null
}
