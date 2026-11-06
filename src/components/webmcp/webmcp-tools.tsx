import {
  createCheckAvailabilityTool,
  createGetContactTool,
  createGetProfileTool,
  createGetProjectTool,
  createListProjectsTool,
  useWebMCP,
} from '../../lib/webmcp'
import type {
  AvailabilityResult,
  ContactResult,
  GetProjectInput,
  GetProjectResult,
  ListProjectsInput,
  ListProjectsResult,
  ProfileResult,
} from '../../lib/webmcp'

const getProfileTool = createGetProfileTool()
const listProjectsTool = createListProjectsTool()
const getProjectTool = createGetProjectTool()
const checkAvailabilityTool = createCheckAvailabilityTool()
const getContactTool = createGetContactTool()

export function WebMcpTools() {
  useWebMCP<Record<string, never>, ProfileResult>(getProfileTool)
  useWebMCP<ListProjectsInput, ListProjectsResult>(listProjectsTool)
  useWebMCP<GetProjectInput, GetProjectResult>(getProjectTool)
  useWebMCP<Record<string, never>, AvailabilityResult>(checkAvailabilityTool)
  useWebMCP<Record<string, never>, ContactResult>(getContactTool)

  return null
}
