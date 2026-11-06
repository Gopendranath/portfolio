import { render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { WebMcpTools } from '../webmcp-tools'

interface RegisteredTool {
  name: string
  description: string
  inputSchema?: Record<string, unknown>
  annotations?: { readOnlyHint?: boolean }
  execute: (
    input: unknown,
    options: { signal: AbortSignal },
  ) => Promise<unknown>
}

afterEach(() => {
  Reflect.deleteProperty(document, 'modelContext')
})

function installModelContext() {
  const tools = new Map<string, RegisteredTool>()
  const registerTool = vi.fn(
    (tool: RegisteredTool, options: { signal: AbortSignal }) => {
      tools.set(tool.name, tool)
      options.signal.addEventListener('abort', () => tools.delete(tool.name))
    },
  )

  Object.defineProperty(document, 'modelContext', {
    configurable: true,
    value: { registerTool },
  })

  return { tools, registerTool }
}

it('registers five read-only tools and removes them on unmount', () => {
  const { tools, registerTool } = installModelContext()
  const { unmount } = render(<WebMcpTools />)

  expect(registerTool).toHaveBeenCalledTimes(5)
  expect([...tools.keys()].sort()).toEqual([
    'check-availability',
    'get-contact',
    'get-profile',
    'get-project',
    'list-projects',
  ])
  for (const tool of tools.values()) {
    expect(tool.annotations?.readOnlyHint).toBe(true)
  }

  unmount()

  expect(tools.size).toBe(0)
})

it('does nothing when document.modelContext is absent', () => {
  expect(() => render(<WebMcpTools />).unmount()).not.toThrow()
})

it('registers agent-facing metadata and normalizes execution results', async () => {
  const { tools } = installModelContext()
  const { unmount } = render(<WebMcpTools />)

  const profile = tools.get('get-profile')
  const project = tools.get('get-project')

  expect(profile?.description).toContain('professional profile')
  expect(profile?.inputSchema).toEqual({ type: 'object', properties: {} })
  expect(project?.inputSchema).toMatchObject({
    type: 'object',
    required: ['slug'],
  })

  const result = await profile?.execute(
    {},
    { signal: new AbortController().signal },
  )

  expect(result).toMatchObject({ content: [{ type: 'text' }] })
  expect(JSON.stringify(result)).toContain('Gopendranath Sasmal')

  unmount()
})
