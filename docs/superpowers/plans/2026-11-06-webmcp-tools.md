# WebMCP Portfolio Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose five read-only WebMCP tools so browser agents can answer recruiter and researcher questions about Gopendranath Sasmal with structured portfolio data.

**Architecture:** Pure tool factories in `src/lib/webmcp/` read the existing `profile` and `projects` data. A single `WebMcpTools` component registers all five through `useWebMCP` from `use-webmcp-tool`, mounted once in `RootLayout`. The browser hook owns feature detection and `AbortSignal` cleanup; unsupported browsers no-op.

**Tech Stack:** React 19.3.1, TypeScript ~7.0.2, Vite 8, Vitest 5, `use-webmcp-tool@0.3.0`, `webmcp-types@0.1.10`, pnpm 12.18.0.

**Spec:** `docs/superpowers/specs/2026-11-06-webmcp-tools-design.md`

## Global Constraints

- WebMCP is early preview: Chromium 146+ with `#enable-webmcp-testing`. No production Origin Trial token in this plan.
- React registration MUST use `useWebMCP` from `use-webmcp-tool`. Never call `document.modelContext.registerTool` or `unregisterTool` directly.
- All five tools set `annotations: { readOnlyHint: true }`.
- Registration is global; no route-scoped `enabled` logic and no visible UI.
- `webmcp-types` must be listed in `compilerOptions.types` in `tsconfig.app.json`; `document.modelContext` stays optional.
- Tools read only the imported `profile` and `projects` data. No network, DOM reads, or state mutations.
- Follow existing style: single quotes, no semicolons, two-space indentation.
- Every task ends with its tests passing. Before the final commit, `pnpm test`, `pnpm exec tsc -b`, `pnpm exec oxlint`, and `pnpm build` must all succeed.

## Review Focus

- Missing or `undefined` tool input must not throw; no-input tools return their data and `list-projects` returns all projects. Pinned in Task 1 and Task 2 tests.
- Wrong JSON types for `technology`, `featuredOnly`, or `slug` must return `{ error, expected }`, not throw. Pinned in Task 2 tests.
- Unknown slugs and display-title slugs must resolve or return available slugs. Pinned in Task 2 tests.
- Technology filters with whitespace, mixed case, partial names, or an empty string must behave predictably. Pinned in Task 2 tests.
- A browser without `document.modelContext`, or unmounting the component, must leave the site working with no registration leaks. Pinned in Task 3 tests.

---

### Task 1: Profile, availability, and contact tools

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`
- Modify: `tsconfig.app.json:7`
- Create: `src/lib/webmcp/tool.ts`
- Create: `src/lib/webmcp/profile-tools.ts`
- Create: `src/lib/webmcp/index.ts`
- Test: `src/lib/webmcp/profile-tools.test.ts`

**Interfaces:**
- Consumes: `profile` from `src/data/profile.ts`.
- Produces: `WebMcpTool<Input, Output>`, `WebMcpExecuteOptions`, `SocialResult`, `ProjectResult`, `ToolError`; `createGetProfileTool()`, `createCheckAvailabilityTool()`, `createGetContactTool()`; `ProfileResult`, `AvailabilityResult`, `ContactResult`.

- [ ] **Step 1: Install the WebMCP dependencies**

```powershell
pnpm add use-webmcp-tool@0.3.0
pnpm add -D webmcp-types@0.1.10
```

Expected: both packages appear in `package.json`; `pnpm-lock.yaml` updates.

- [ ] **Step 2: Add WebMCP types to the app tsconfig**

Change the `types` line in `tsconfig.app.json` from:

```json
"types": ["vite/client"],
```

to:

```json
"types": ["vite/client", "webmcp-types"],
```

- [ ] **Step 3: Write the failing profile tool tests**

Create `src/lib/webmcp/profile-tools.test.ts`:

```ts
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
    expect(() =>
      createGetProfileTool().execute(undefined as never, options),
    ).not.toThrow()
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
})
```

- [ ] **Step 4: Run the tests to verify they fail**

```powershell
pnpm vitest run src/lib/webmcp/profile-tools.test.ts
```

Expected: FAIL because `./profile-tools` cannot be resolved.

- [ ] **Step 5: Create the shared tool type**

Create `src/lib/webmcp/tool.ts`:

```ts
export interface WebMcpExecuteOptions {
  signal: AbortSignal
}

export interface WebMcpTool<Input, Output> {
  readonly name: string
  readonly description: string
  readonly inputSchema: Record<string, unknown>
  readonly annotations: { readonly readOnlyHint: true }
  execute: (input: Input, options: WebMcpExecuteOptions) => Output
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
```

- [ ] **Step 6: Implement the three profile tools**

Create `src/lib/webmcp/profile-tools.ts` with these exported interfaces and exact factory signatures:

```ts
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

export function createGetProfileTool(): WebMcpTool<
  Record<string, never>,
  ProfileResult
>

export function createCheckAvailabilityTool(): WebMcpTool<
  Record<string, never>,
  AvailabilityResult
>

export function createGetContactTool(): WebMcpTool<
  Record<string, never>,
  ContactResult
>
```

Implementation requirements:

- All three use `inputSchema: { type: 'object', properties: {} }` and `annotations: { readOnlyHint: true }`.
- `get-profile` description: `Returns Gopendranath Sasmal's professional profile, including role, location, timezone, biography, technical stack, and social profiles. Use when the user asks who he is, what he does, or what technologies he works with.`
- `check-availability` description: `Reports whether Gopendranath is currently open to work, along with location, timezone, and resume availability. Use when the user asks about hiring or availability.`
- `get-contact` description: `Returns Gopendranath's email, social profiles, location, and timezone. Use when the user asks how to contact him.`
- `get-profile` reads `profile` directly and omits the social entry whose `id` is `'email'`.
- `check-availability` sets `openToWork` to `profile.availability === 'Open to work'` and `note` to `'Resume is not published on this site.'` when `resumeAvailable` is false, otherwise `''`.
- `get-contact` sets `mailto` to `` `mailto:${profile.email}` ``, `preferredChannel` to `'email'`, and omits the email social entry.
- Each `execute` returns fresh arrays/objects rather than reusing mutable module-level result objects.

Create `src/lib/webmcp/index.ts`:

```ts
export {
  createCheckAvailabilityTool,
  createGetContactTool,
  createGetProfileTool,
} from './profile-tools'
export type {
  AvailabilityResult,
  ContactResult,
  ProfileResult,
} from './profile-tools'
export type {
  ProjectResult,
  SocialResult,
  ToolError,
  WebMcpExecuteOptions,
  WebMcpTool,
} from './tool'
```

- [ ] **Step 7: Run the tests to verify they pass**

```powershell
pnpm vitest run src/lib/webmcp/profile-tools.test.ts
```

Expected: PASS, 6 tests.

- [ ] **Step 8: Commit**

```powershell
git add package.json pnpm-lock.yaml tsconfig.app.json src/lib/webmcp/tool.ts src/lib/webmcp/profile-tools.ts src/lib/webmcp/index.ts src/lib/webmcp/profile-tools.test.ts
git commit -m "feat(webmcp): add profile, availability, contact tools"
```

---

### Task 2: Project listing and lookup tools

**Files:**
- Create: `src/lib/webmcp/project-tools.ts`
- Modify: `src/lib/webmcp/index.ts`
- Test: `src/lib/webmcp/project-tools.test.ts`

**Interfaces:**
- Consumes: `projects` from `src/data/projects.ts`; `WebMcpTool`, `ProjectResult`, `ToolError` from `./tool`.
- Produces: `ListProjectsInput`, `ListProjectsResult`, `GetProjectInput`, `GetProjectResult`; `createListProjectsTool()`, `createGetProjectTool()`.

- [ ] **Step 1: Write the failing project tool tests**

Create `src/lib/webmcp/project-tools.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  createGetProjectTool,
  createListProjectsTool,
} from './project-tools'

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
    const result = createListProjectsTool().execute(
      undefined as never,
      options,
    )
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
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```powershell
pnpm vitest run src/lib/webmcp/project-tools.test.ts
```

Expected: FAIL because `./project-tools` cannot be resolved.

- [ ] **Step 3: Implement the project tools**

Create `src/lib/webmcp/project-tools.ts` with these exported interfaces and exact factory signatures:

```ts
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

export function createListProjectsTool(): WebMcpTool<
  ListProjectsInput,
  ListProjectsResult
>

export function createGetProjectTool(): WebMcpTool<
  GetProjectInput,
  GetProjectResult
>
```

Implementation requirements:

- `list-projects` description: `Lists Gopendranath's portfolio projects with summaries, stacks, years, and links. Use when the user asks what he has built.`
- `get-project` description: `Returns one portfolio project with its summary, stack, year, and links. Use when the user asks about a specific project.`
- Both use `annotations: { readOnlyHint: true }`.
- `list-projects` schema: object with `technology` (string, description `Technology to match against project stacks, such as React, Spring Boot, or Supabase.`) and `featuredOnly` (boolean, default `false`, description `Return only projects marked as featured.`). No required keys.
- `get-project` schema: object with required `slug` (string, enum of the six slugs in `allSlugs` order, description `Project slug returned by list-projects.`).
- Normalize each project once into `ProjectResult` with `featured: project.featured ?? false`, copied `stack`, and copied `links`.
- `list-projects` validates `technology` before use: if defined and not a string, return the exact error object from the test. Validates `featuredOnly`: default `false`; if not a boolean, return the exact error object from the test.
- Technology matching: trim, lowercase, substring match against each stack entry. A blank trimmed value means no filter.
- Empty results return `count: 0`, `projects: []`, `message: \`No projects match "${trimmedTechnology}".\``, and `availableTechnologies` = sorted unique stack entries. If no technology was supplied, use `No projects match.` as the message.
- `get-project` validates `slug` before lookup: if not a string or blank after trim, return `{ error: 'Pass a project slug.', expected: 'slug: string' }`.
- Lookup matches slug case-insensitively first, then title case-insensitively.
- Unknown lookup returns `{ error: \`Project "${slug}" not found.\`, availableSlugs: allSlugs }`.
- Sort `availableTechnologies` with `localeCompare` for deterministic output.

Append to `src/lib/webmcp/index.ts`:

```ts
export {
  createGetProjectTool,
  createListProjectsTool,
} from './project-tools'
export type {
  GetProjectInput,
  GetProjectResult,
  ListProjectsInput,
  ListProjectsResult,
} from './project-tools'
```

- [ ] **Step 4: Run the tests to verify they pass**

```powershell
pnpm vitest run src/lib/webmcp/project-tools.test.ts
```

Expected: PASS, 15 tests.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/webmcp/project-tools.ts src/lib/webmcp/project-tools.test.ts src/lib/webmcp/index.ts
git commit -m "feat(webmcp): add project listing and lookup tools"
```

---

### Task 3: React registration and mount

**Files:**
- Create: `src/components/webmcp/webmcp-tools.tsx`
- Test: `src/components/webmcp/webmcp-tools.test.tsx`
- Modify: `src/components/layout/root-layout.tsx`

**Interfaces:**
- Consumes: all five factory functions and their result types from `../../lib/webmcp`.
- Produces: `WebMcpTools` React component (no props, returns `null`).

- [ ] **Step 1: Write the failing registration test**

Create `src/components/webmcp/webmcp-tools.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { WebMcpTools } from './webmcp-tools'

interface RegisteredTool {
  name: string
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
```

- [ ] **Step 2: Run the test to verify it fails**

```powershell
pnpm vitest run src/components/webmcp/webmcp-tools.test.tsx
```

Expected: FAIL because `./webmcp-tools` cannot be resolved.

- [ ] **Step 3: Implement the component**

Create `src/components/webmcp/webmcp-tools.tsx`:

```tsx
import { useWebMCP } from 'use-webmcp-tool'
import {
  createCheckAvailabilityTool,
  createGetContactTool,
  createGetProfileTool,
  createGetProjectTool,
  createListProjectsTool,
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
```

Tool objects stay at module scope so their identity is stable across route-driven re-renders. All five hook calls are unconditional.

- [ ] **Step 4: Mount the component in the root layout**

In `src/components/layout/root-layout.tsx`, add:

```tsx
import { WebMcpTools } from '../webmcp/webmcp-tools'
```

Then make it the first child of `SidebarProvider`:

```tsx
<SidebarProvider>
  <WebMcpTools />
  <SkipLink />
  <SidebarRouteSync />
```

- [ ] **Step 5: Run the registration test to verify it passes**

```powershell
pnpm vitest run src/components/webmcp/webmcp-tools.test.tsx
```

Expected: PASS, 3 tests.

- [ ] **Step 6: Run the full verification suite**

```powershell
pnpm test
pnpm exec tsc -b
pnpm exec oxlint
pnpm build
```

Expected: all tests pass, `tsc` exits 0, `oxlint` exits 0, Vite build succeeds.

- [ ] **Step 7: Commit the component and mount**

```powershell
git add src/components/webmcp/webmcp-tools.tsx src/components/webmcp/webmcp-tools.test.tsx src/components/layout/root-layout.tsx
git commit -m "feat(webmcp): expose portfolio tools to browser agents"
```

---

### Task 4: Agent discovery and final verification

**Files:**
- Modify: `public/llms.txt`

**Interfaces:**
- Consumes: the five tool names from Task 3.
- Produces: a text-agent discovery note; no runtime interface.

- [ ] **Step 1: Add the WebMCP section to llms.txt**

In `public/llms.txt`, insert this section immediately before `## Optional`:

```markdown
## WebMCP

In supported browsers, this site exposes five read-only WebMCP tools for agent Q&A: `get-profile`, `list-projects`, `get-project`, `check-availability`, and `get-contact`. Each returns structured data from the same source as the pages above.
```

- [ ] **Step 2: Build and verify the copied file**

```powershell
pnpm build
node -e "const t=require('fs').readFileSync('dist/llms.txt','utf8'); console.log(t.includes('## WebMCP') ? 'ok' : 'missing')"
```

Expected: build succeeds and the command prints `ok`.

- [ ] **Step 3: Verify the tool list text**

```powershell
Select-String -Path dist/llms.txt -Pattern "get-profile|list-projects|get-project|check-availability|get-contact"
```

Expected: one line containing all five names.

- [ ] **Step 4: Run the final verification suite**

```powershell
pnpm test
pnpm exec tsc -b
pnpm exec oxlint
pnpm build
```

Expected: all tests pass, `tsc` exits 0, `oxlint` exits 0, Vite build succeeds.

- [ ] **Step 5: Commit**

```powershell
git add public/llms.txt
git commit -m "docs: list WebMCP tools in llms.txt"
```

- [ ] **Step 6: Manual browser check**

Run `pnpm dev` and open the site in Chrome or Edge with
`chrome://flags/#enable-webmcp-testing` enabled. In DevTools:

```js
const tools = await document.modelContext.getTools()
tools.map((tool) => tool.name)
```

Expected: `['get-profile', 'list-projects', 'get-project', 'check-availability', 'get-contact']` in any order. Then execute one tool:

```js
const list = tools.find((tool) => tool.name === 'list-projects')
await document.modelContext.executeTool(list, { technology: 'react' })
```

Expected: serialized JSON containing `movie-app-web` and `walmart-v1`. On builds older than Chrome 155, pass `JSON.stringify({ technology: 'react' })` instead of the object.

If Chrome/Edge with the flag is unavailable, note that this manual step was skipped; the automated registration test still passes.

- [ ] **Step 7: Confirm a clean tree**

```powershell
git status --short
```

Expected: no output.
