# WebMCP Tools for the Portfolio

Date: 2026-11-06
Status: Approved design, pending user review

## Purpose

Browser agents should answer recruiter and researcher questions about
Gopendranath Sasmal with structured data instead of scraping the DOM. The site
exposes five read-only WebMCP tools covering profile, projects, availability,
and contact details.

## Scope

- Five read-only tools: `get-profile`, `list-projects`, `get-project`,
  `check-availability`, `get-contact`.
- Global registration: tools are available on every route.
- React integration through `useWebMCP` from `use-webmcp-tool`.
- Feature detection: unsupported browsers are unaffected.
- Local verification with the Chromium `#enable-webmcp-testing` flag.

## Non-goals

- Navigation tools or UI actuation.
- Any tool that mutates state.
- Resume download or resume content (no resume is published).
- Project detail routes.
- Production Origin Trial token until a real production origin exists.
- Route-scoped registration.

## Architecture

### Files

```
src/lib/webmcp/
  tool.ts                  WebMcpTool type and shared result types
  profile-tools.ts         get-profile, check-availability, get-contact
  project-tools.ts         list-projects, get-project, lookup helpers
  index.ts                 re-exports
  profile-tools.test.ts
  project-tools.test.ts
src/components/webmcp/
  webmcp-tools.tsx         five useWebMCP calls, renders null
  webmcp-tools.test.tsx
```

### Data flow

1. `RootLayout` mounts `<WebMcpTools />` once.
2. `webmcp-tools.tsx` creates five tool objects at module scope and passes each
   to `useWebMCP`.
3. The hook detects `document.modelContext`, registers the tools, and aborts
   registration on unmount.
4. An agent calls a tool; `execute` reads the imported `profile` and `projects`
   data and returns a JSON-serializable value.
5. No network requests, DOM reads, or application state changes occur.

### Mount point

Add `<WebMcpTools />` as the first child of `SidebarProvider` in
`src/components/layout/root-layout.tsx`. The component has no provider
dependencies.

### Dependencies

- `use-webmcp-tool@0.3.0` in `dependencies`.
- `webmcp-types@0.1.10` in `devDependencies`.
- Add `"webmcp-types"` to `compilerOptions.types` in `tsconfig.app.json`, which
  currently contains only `"vite/client"`.

## Tool contracts

All tools use `annotations: { readOnlyHint: true }`. None set
`untrustedContentHint`, `consequentialHint`, or `debugging`.

### `get-profile`

Description: "Returns Gopendranath Sasmal's professional profile, including
role, location, timezone, biography, technical stack, and social profiles. Use
when the user asks who he is, what he does, or what technologies he works
with."

Input schema:

```json
{ "type": "object", "properties": {} }
```

Result:

```ts
{
  name: string
  firstName: string
  lastName: string
  role: string
  location: string
  timezone: string
  bio: string
  about: string[]
  stack: Array<{ title: string; items: string[] }>
  socials: Array<{ label: string; href: string }>
}
```

The email social entry is omitted; contact details belong to `get-contact`.

### `list-projects`

Description: "Lists Gopendranath's portfolio projects with summaries, stacks,
years, and links. Use when the user asks what he has built."

Input schema:

```json
{
  "type": "object",
  "properties": {
    "technology": {
      "type": "string",
      "description": "Technology to match against project stacks, such as React, Spring Boot, or Supabase."
    },
    "featuredOnly": {
      "type": "boolean",
      "default": false,
      "description": "Return only projects marked as featured."
    }
  }
}
```

Result:

```ts
{
  count: number
  projects: Array<{
    slug: string
    title: string
    year: string
    summary: string
    stack: string[]
    links: Array<{ label: string; href: string }>
    featured: boolean
  }>
}
```

Matching rules:

- `technology` is trimmed, lowercased, and matched as a substring of any stack
  entry. `react` matches `React 19` and `React`.
- `featuredOnly` defaults to `false`.
- `featured` is normalized to `false` when the source project omits it.
- No matches returns `{ count: 0, projects: [], message, availableTechnologies }`,
  where `availableTechnologies` is the sorted unique stack list.
- A non-string `technology` or non-boolean `featuredOnly` returns
  `{ error, expected }`.

### `get-project`

Description: "Returns one portfolio project with its summary, stack, year, and
links. Use when the user asks about a specific project."

Input schema:

```json
{
  "type": "object",
  "properties": {
    "slug": {
      "type": "string",
      "enum": [
        "movie-app-web",
        "product-management",
        "terminal-web-vm",
        "rag-pdf-chat",
        "i-hate-npm",
        "walmart-v1"
      ],
      "description": "Project slug returned by list-projects."
    }
  },
  "required": ["slug"]
}
```

Result: one project object with the same shape as a `list-projects` entry.

Lookup rules:

- Match `slug` case-insensitively first, then fall back to a case-insensitive
  `title` match. This tolerates agents passing a display title.
- Missing or non-string `slug` returns `{ error, expected }`.
- Unknown project returns `{ error, availableSlugs }`.

### `check-availability`

Description: "Reports whether Gopendranath is currently open to work, along
with location, timezone, and resume availability. Use when the user asks about
hiring or availability."

Input schema:

```json
{ "type": "object", "properties": {} }
```

Result:

```ts
{
  availability: string
  openToWork: boolean
  location: string
  timezone: string
  resumeAvailable: boolean
  note: string
}
```

`openToWork` is derived with `profile.availability === 'Open to work'`.
`note` is "Resume is not published on this site." when `resumeAvailable` is
false, otherwise an empty string. Work-location preference stays in `bio` and
is not duplicated as a structured field.

### `get-contact`

Description: "Returns Gopendranath's email, social profiles, location, and
timezone. Use when the user asks how to contact him."

Input schema:

```json
{ "type": "object", "properties": {} }
```

Result:

```ts
{
  email: string
  mailto: string
  preferredChannel: 'email'
  location: string
  timezone: string
  socials: Array<{ label: string; href: string }>
}
```

The email social entry is omitted from `socials`; `email` and `mailto` carry it.

## Lifecycle

`useWebMCP` handles feature detection, registration, and cleanup. The
application does not call `document.modelContext.registerTool` directly, does
not call `unregisterTool`, and does not wrap the hook in a custom lifecycle
helper.

Tool objects are created at module scope so their identity is stable across
`RootLayout` re-renders caused by route changes. All five `useWebMCP` calls run
unconditionally. `enabled` is unused because registration is global.

Unsupported browsers: the hook no-ops and the component renders `null`.

## Error handling

The browser does not validate `inputSchema` or apply defaults, so every
`execute` validates input and applies defaults itself.

Expected failures are returned as values so the agent receives diagnostic
detail:

- Unknown project: `{ error, availableSlugs }`.
- No technology match: `{ count: 0, projects: [], message, availableTechnologies }`.
- Wrong input type: `{ error, expected }`.

Thrown errors are reserved for genuine bugs. The hook normalizes a thrown value
into `{ content, isError: true }`, so a failure never reads as success.

All tools are synchronous reads of in-memory data. They accept the
`{ signal }` argument for API compatibility but perform no async work, so there
is nothing to cancel.

## TypeScript

Define explicit input and result interfaces per tool. Type each hook call as
`useWebMCP<Input, Result>(tool)`. Do not hand-write `document.modelContext`
declarations; `webmcp-types` supplies them through the `types` array.

## Testing

Factory tests call `execute` directly with
`{ signal: new AbortController().signal }`; jsdom is not required.

`profile-tools.test.ts`:

- Profile result includes name, role, stack, and about text.
- Socials exclude the email entry.
- Availability derives `openToWork: true` and reports the resume note.
- Contact returns email, `mailto`, preferred channel, and non-email socials.

`project-tools.test.ts`:

- All six projects are returned with slugs.
- `featuredOnly: true` returns only featured projects.
- Technology matching is case-insensitive, partial, and trimmed.
- Invalid `technology` and `featuredOnly` types return errors.
- Zero matches return an empty list with available technologies.
- `get-project` resolves by slug and by display title.
- Missing slug, non-string slug, and unknown slug return errors.

`webmcp-tools.test.tsx`:

- With a fake `document.modelContext.registerTool`, rendering the component
  registers five unique tool names, each with `readOnlyHint: true`.
- Unmounting aborts registration and removes the tools from the fake.
- Rendering without `document.modelContext` does not throw.

The test environment already uses jsdom with `src/test/setup.ts`.

## Rollout

- Ship feature-detected. Unsupported browsers are unaffected.
- Defer the production Origin Trial token until a verified production origin
  exists. The token is required for Chrome and Edge users outside the testing
  flag.
- Commit `.mwgrc` with the feature; guidance says the Origin Trial opt-in file
  should be shared.
- Add a `## WebMCP` section to `public/llms.txt` listing the five tool names.

## Local verification

1. Run `pnpm dev` and open the site in Chrome or Edge with
   `chrome://flags/#enable-webmcp-testing` enabled.
2. Run `await document.modelContext.getTools()` in DevTools; expect five tools.
3. Execute `list-projects` with `{ "technology": "react" }`; expect the React
   projects. Use an object input on Chrome 155+ and a stringified fallback on
   older builds.
4. Navigate between routes; tools remain registered.
5. Open the site in an unsupported browser; `document.modelContext` is
   undefined and the site behaves normally.

## Success criteria

- "Who is Gopendranath?" resolves through `get-profile`.
- "Which projects use React?" resolves through `list-projects`.
- "Tell me about RAG PDF Chat" resolves through `get-project`.
- "Is he open to work?" resolves through `check-availability`.
- "How do I contact him?" resolves through `get-contact`.
- All factory and wiring tests pass, and `pnpm build` succeeds.

## Risks

- WebMCP is an early-preview API and may change. The Chrome-maintained hook and
  `webmcp-types` isolate most churn.
- Production use requires an Origin Trial token bound to a real origin.
- Tool output mirrors site data. Keeping tools on the same imported data avoids
  drift, except for the derived `openToWork` flag.
