export interface WebMcpExecuteOptions {
  signal: AbortSignal
}

export interface WebMcpTool<Input, Output> {
  readonly name: string
  readonly description: string
  readonly inputSchema: Record<string, unknown>
  readonly annotations: { readonly readOnlyHint: true }
  execute: (input: Input | undefined, options: WebMcpExecuteOptions) => Output
}

export interface SocialResult {
  label: string
  href: string
}

export interface ProjectResult {
  slug: string
  title: string
  year: string
  summary: string
  stack: string[]
  links: Array<{ label: string; href: string }>
  featured: boolean
}

export interface ToolError {
  error: string
  expected?: string
}
