# Functions Deepening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove duplicated transaction/message-write SQL, route boilerplate, and the hidden stale-stream write in `functions/` without changing behavior.

**Architecture:** Targeted refactor. Add one transaction helper, one message-write module, one message-read use case, one auth helper, and split the conversation routes by resource. Existing deep modules (`history`, `inbox`, `rate-limit`) stay intact. Every task is a move/extract with existing tests as the regression gate.

**Tech Stack:** TypeScript, Hono 4, `pg`, Zod 4, Vitest 5.1.0, Biome 2.6.6, pnpm.

**Spec:** `docs/superpowers/specs/2026-11-12-functions-deepening-design.md`

## Global Constraints

- Move-only refactor. Do not change route paths, methods, status codes, JSON shapes, error codes/messages, SSE payloads, rate-limit values, CORS behavior, or SQL semantics.
- No folder-wide `platform/` / `integrations/` reorganization.
- Do not split `history.ts`, `inbox.ts`, or `rate-limit.ts`.
- `rate-limit.ts` is not refactored. Its rollback-on-denial is domain logic.
- No new dependencies. Flat files under `functions/chat/`; no barrel files.
- `withTransaction` callbacks must not call `begin`, `commit`, or `rollback`.
- Keep SQL ordering: assistant edit records the revision, updates the body, supersedes later messages, inserts the streaming assistant placeholder, then touches the conversation.
- Existing DB tests require `TEST_DATABASE_URL`; Vitest loads it from the repo env. Never print the value.
- Run `pnpm typecheck` and the named tests after every task. One commit per task.

## Review Focus

- **Route split drops or mismounts a handler.** A missing route becomes 404 instead of the expected 401/200. `functions/__tests__/routes.test.ts` pins every path.
- **`withTransaction` commits or releases incorrectly.** A callback failure must roll back and rethrow; success must commit once and release once. `transaction.test.ts` pins the sequence.
- **Assistant edit/retry SQL order changes.** Revisions, superseded rows, and the new streaming placeholder must remain in the current order. Existing `ai.test.ts` cases pin fork, revision, retry, ownership, and retitle behavior.
- **Stale-stream repair is bypassed.** Every message-read path must call `getMessagePage`, not raw `listMessages`; otherwise interrupted streams stay `streaming` forever. The existing stale test moves to `getMessagePage`.
- **Auth helper changes guard order.** `requireAuth` must run before `getPool` / `resolveAppUser`, and owner/AI guards must stay explicit at the route level. `routes.test.ts` expects 401 for every protected route without a token.

---

### Task 1: Add `withTransaction` and use it in `messages.ts`

**Files:**
- Modify: `functions/chat/db.ts`
- Modify: `functions/chat/messages.ts` (`createMessage`, `editMessage`)
- Create: `functions/__tests__/transaction.test.ts`

**Interfaces:**
- Produces: `withTransaction<T>(pool: Pool, work: (client: PoolClient) => Promise<T>): Promise<T>`
- Consumes: `Pool`, `PoolClient` from `pg`.

- [ ] **Step 1: Write the failing transaction test**

Create `functions/__tests__/transaction.test.ts`:

```ts
import type { Pool, PoolClient } from 'pg'
import { describe, expect, it } from 'vitest'
import { withTransaction } from '../chat/db'

function fakePool(calls: string[]): Pool {
  const client = {
    query: async (sql: string) => {
      calls.push(sql)
      return { rows: [] }
    },
    release: () => calls.push('release'),
  } as unknown as PoolClient

  return { connect: async () => client } as unknown as Pool
}

describe('withTransaction', () => {
  it('commits and returns the callback result', async () => {
    const calls: string[] = []
    const result = await withTransaction(fakePool(calls), async () => {
      calls.push('work')
      return 42
    })

    expect(result).toBe(42)
    expect(calls).toEqual(['begin', 'work', 'commit', 'release'])
  })

  it('rolls back and rethrows when the callback fails', async () => {
    const calls: string[] = []

    await expect(
      withTransaction(fakePool(calls), async () => {
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')

    expect(calls).toEqual(['begin', 'rollback', 'release'])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run functions/__tests__/transaction.test.ts`
Expected: FAIL because `withTransaction` is not exported from `../chat/db`.

- [ ] **Step 3: Implement `withTransaction` in `functions/chat/db.ts`**

Add:

```ts
export async function withTransaction<T>(
  pool: Pool,
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('begin')
    const result = await work(client)
    await client.query('commit')
    return result
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}
```

- [ ] **Step 4: Refactor `createMessage` and `editMessage` to use it**

In `createMessage`, wrap the existing insert + conversation update in `withTransaction`; return the inserted `MessageRow` from the callback, then call `toMessageDTO` after commit.

In `editMessage`, wrap the existing select/lock, permission check, revision insert, body update, and conversation update in `withTransaction`; return the updated `MessageRow`, then call `toMessageDTO` after commit. Keep the current `ApiError` messages and permission rules unchanged.

- [ ] **Step 5: Run tests and typecheck**

Run: `pnpm exec vitest run functions/__tests__/transaction.test.ts`
Expected: PASS (2 tests).

Run: `pnpm exec vitest run functions/__tests__/conversations.test.ts`
Expected: PASS (edit/idempotency/pagination tests unchanged).

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add functions/chat/db.ts functions/chat/messages.ts functions/__tests__/transaction.test.ts
git commit -m "refactor: add transaction helper for message writes"
```

---

### Task 2: Extract message row helpers and user-edit writes

**Files:**
- Create: `functions/chat/message-rows.ts`
- Create: `functions/chat/message-writes.ts`
- Modify: `functions/chat/messages.ts`
- Modify: `functions/chat/ai-turns.ts` (import row helpers from `message-rows`; behavior unchanged)
- Test: `functions/__tests__/conversations.test.ts`

**Interfaces:**
- Produces `message-rows.ts`: `MessageRow`, `MESSAGE_COLUMNS`, `toMessageDTO(row: MessageRow): ChatMessageDTO`.
- Produces `message-writes.ts`:

```ts
export interface LockedMessage {
  id: string
  body: string
  author: ChatAuthor
  conversationId: string
  seq: number
  status: MessageStatus
  userId: string
  kind: 'owner' | 'assistant'
}

lockMessageForUpdate(
  client: PoolClient,
  messageId: string,
): Promise<LockedMessage | undefined>

writeUserEdit(
  client: PoolClient,
  input: {
    message: LockedMessage
    body: string
    editorUserId: string
    now: Date
  },
): Promise<MessageRow>
```

- Consumes: `ChatAuthor`, `MessageStatus` from `../../src/lib/chat/protocol`; `ApiError` from `./errors`.

- [ ] **Step 1: Run the baseline edit tests**

Run: `pnpm exec vitest run functions/__tests__/conversations.test.ts`
Expected: PASS before any edits. These are the regression gate.

- [ ] **Step 2: Move row helpers to `message-rows.ts`**

Move `MessageRow`, `MESSAGE_COLUMNS`, and `toMessageDTO` verbatim from `messages.ts` into `message-rows.ts`. Update imports in `messages.ts` and `ai-turns.ts` to import them from `./message-rows`. Do not change the row shape or DTO mapping.

- [ ] **Step 3: Create `message-writes.ts`**

Implement `lockMessageForUpdate` with:

```sql
select m.id, m.body, m.author, m.conversation_id, m.seq, m.status,
       c.user_id, c.kind
  from messages m
  join conversations c on c.id = m.conversation_id
 where m.id = $1
   and m.deleted_at is null
 for update
```

Map `seq` with `Number(row.seq)` and snake_case columns to the `LockedMessage` shape.

Implement `writeUserEdit` to preserve the current `editMessage` sequence:

1. Insert into `message_revisions (message_id, body, edited_by_user_id, edited_at)`.
2. Update `messages` body and `edited_at`, returning `${MESSAGE_COLUMNS}`.
3. Update the conversation `updated_at = now()` only.
4. Return the updated `MessageRow`; throw `new ApiError('INTERNAL', 'Could not update the message')` if no row is returned.

- [ ] **Step 4: Refactor `messages.editMessage` to use the new module**

Inside `withTransaction`, call `lockMessageForUpdate`, keep the current `canEdit` rule (`existing.kind === 'owner'` and either the user owns the message or `allowOwner` for owner-authored messages), throw the same `NOT_FOUND` error, then call `writeUserEdit`. Return `toMessageDTO(row)` after commit.

Remove the duplicated revision/update/touch SQL from `messages.ts`.

- [ ] **Step 5: Run tests and typecheck**

Run: `pnpm exec vitest run functions/__tests__/conversations.test.ts`
Expected: PASS (own edit, revision, other-user rejection unchanged).

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add functions/chat/message-rows.ts functions/chat/message-writes.ts functions/chat/messages.ts functions/chat/ai-turns.ts
git commit -m "refactor: extract message row helpers and user edit writes"
```

---

### Task 3: Move assistant edit/retry writes into `message-writes.ts`

**Files:**
- Modify: `functions/chat/message-writes.ts`
- Modify: `functions/chat/ai-turns.ts` (`beginAssistantEdit`, `beginAssistantRetry`)
- Test: `functions/__tests__/ai.test.ts`

**Interfaces:**
- Add to `message-writes.ts`:

```ts
lockRetryTarget(
  client: PoolClient,
  messageId: string,
): Promise<LockedMessage | undefined>

writeAssistantEdit(
  client: PoolClient,
  input: {
    message: LockedMessage
    body: string
    editorUserId: string
    now: Date
    model: string
  },
): Promise<{ edited: MessageRow; assistant: MessageRow }>

writeAssistantRetry(
  client: PoolClient,
  input: {
    failed: LockedMessage
    userMessage: MessageRow
    now: Date
    model: string
  },
): Promise<MessageRow>
```

- Consumes: `withTransaction` from `./db`; existing `retitleAssistantConversation`, `loadContext`, `OPENROUTER_MODEL`.

- [ ] **Step 1: Run the baseline assistant tests**

Run: `pnpm exec vitest run functions/__tests__/ai.test.ts`
Expected: PASS before any edits. These are the regression gate.

- [ ] **Step 2: Implement `lockRetryTarget`**

Same selected columns as `lockMessageForUpdate`, but no `deleted_at is null` filter. This preserves the current retry lookup.

- [ ] **Step 3: Implement `writeAssistantEdit`**

Preserve the current `beginAssistantEdit` SQL order:

1. Insert into `message_revisions` using `message.body`, `editorUserId`, and `now`.
2. Update `messages` body and `edited_at`, returning `${MESSAGE_COLUMNS}`.
3. Supersede later messages:
   `status = 'superseded', deleted_at = $3 where conversation_id = $1 and seq > $2 and deleted_at is null`.
4. Insert the streaming assistant placeholder with `conversation_id`, `author = 'assistant'`, `body = ''`, `status = 'streaming'`, `reply_to_id = message.id`, `model`, returning `${MESSAGE_COLUMNS}`.
5. Update the conversation: `updated_at = now(), last_message_at = $2` using `now`.
6. Return both rows. Throw `new ApiError('INTERNAL', 'Could not edit the message')` if either row is missing.

- [ ] **Step 4: Implement `writeAssistantRetry`**

Preserve the current retry SQL order:

1. Supersede/soft-delete the failed message: `status = 'superseded', deleted_at = $2 where id = $1` using `now`.
2. Insert the streaming assistant placeholder with `reply_to_id = userMessage.id`, `model`, returning `${MESSAGE_COLUMNS}`.
3. Update the conversation with the current SQL: `updated_at = now(), last_message_at = now()`.
4. Return the assistant row. Throw `new ApiError('INTERNAL', 'Could not create the retry message')` if missing.

- [ ] **Step 5: Refactor `beginAssistantEdit` and `beginAssistantRetry`**

`beginAssistantEdit`:

- Run inside `withTransaction`.
- Call `lockMessageForUpdate`.
- Keep the current ownership/kind/author checks and `NOT_FOUND` message.
- Call `writeAssistantEdit` with `OPENROUTER_MODEL`.
- Return `{ conversationId, seq, edited, assistant }` from the transaction.
- After commit, call `retitleAssistantConversation(pool, conversationId, seq, body)`, then `loadContext(pool, conversationId, seq)`, then build the `AssistantTurn`.

`beginAssistantRetry`:

- Run inside `withTransaction`.
- Call `lockRetryTarget`.
- Keep the current ownership/kind/author/status checks and `NOT_FOUND` message.
- Keep the existing query for the prior user message.
- Call `writeAssistantRetry` with `OPENROUTER_MODEL`.
- Return `{ conversationId, userMessage, assistant }` from the transaction.
- After commit, build DTOs and call `loadContext(pool, conversationId, Number(userMessage.seq))`.

Remove `pool.connect`, `begin`, `commit`, `rollback`, `release`, and the moved write SQL from `ai-turns.ts`. Keep `loadContext`, the duplicate-reply check, and the prior-user-message query in `ai-turns.ts`.

- [ ] **Step 6: Run tests and typecheck**

Run: `pnpm exec vitest run functions/__tests__/ai.test.ts`
Expected: PASS (fork, revision, retry, ownership, retitle).

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add functions/chat/message-writes.ts functions/chat/ai-turns.ts
git commit -m "refactor: extract assistant edit and retry writes"
```

---

### Task 4: Separate stale-stream repair from message listing

**Files:**
- Create: `functions/chat/stale-streams.ts`
- Create: `functions/chat/message-page.ts`
- Modify: `functions/chat/messages.ts` (`listMessages`)
- Modify: `functions/routes/conversations.ts`
- Modify: `functions/chat/inbox.ts`
- Test: `functions/__tests__/conversations.test.ts`

**Interfaces:**
- Produces `stale-streams.ts`: `markStaleStreamingMessagesFailed(pool: Pool, conversationId: string, now?: Date): Promise<void>`
- Produces `message-page.ts`: `getMessagePage(pool: Pool, conversationId: string, options?: { beforeSeq?: number; limit?: number }): Promise<MessagePage>`
- `messages.listMessages` becomes a pure read with the same options and return shape.

- [ ] **Step 1: Move the stale-stream update into `stale-streams.ts`**

Use the current SQL verbatim, parameterizing the comparison time with `now`:

```sql
update messages
   set status = 'failed',
       error_code = coalesce(error_code, 'STALE_STREAM'),
       error_message = coalesce(error_message, 'The response was interrupted.')
 where conversation_id = $1
   and status = 'streaming'
   and created_at < $2::timestamptz - interval '2 minutes'
```

`now` defaults to `new Date()`.

- [ ] **Step 2: Add `getMessagePage`**

```ts
export async function getMessagePage(
  pool: Pool,
  conversationId: string,
  options: { beforeSeq?: number; limit?: number } = {},
): Promise<MessagePage> {
  await markStaleStreamingMessagesFailed(pool, conversationId)
  return listMessages(pool, conversationId, options)
}
```

Import `MessagePage` from `../../src/lib/chat/protocol`.

- [ ] **Step 3: Remove the stale update from `listMessages`**

Delete the first `pool.query` block in `listMessages`. Keep the select, pagination, filtering, and return shape unchanged. Change the return type to `Promise<MessagePage>`.

- [ ] **Step 4: Update all message-read callers**

- `functions/routes/conversations.ts`: replace `listMessages` imports/calls with `getMessagePage` (three call sites: assistant fallback, assistant by conversation id, owner kind).
- `functions/chat/inbox.ts`: `getOwnerThreadMessages` uses `getMessagePage`.
- `functions/__tests__/conversations.test.ts`: import `getMessagePage` from `../chat/message-page` and use it for the pagination, hide, and stale-stream tests.

- [ ] **Step 5: Run tests and typecheck**

Run: `pnpm exec vitest run functions/__tests__/conversations.test.ts`
Expected: PASS, including the stale `STALE_STREAM` case.

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add functions/chat/stale-streams.ts functions/chat/message-page.ts functions/chat/messages.ts functions/routes/conversations.ts functions/chat/inbox.ts functions/__tests__/conversations.test.ts
git commit -m "refactor: separate stale stream repair from message reads"
```

---

### Task 5: Add `requireAppUser` and route regression test

**Files:**
- Create: `functions/http/app-user.ts`
- Create: `functions/__tests__/routes.test.ts`
- Modify: `functions/routes/me.ts`
- Modify: `functions/routes/assistant.ts`
- Modify: `functions/routes/owner-chat.ts`
- Modify: `functions/routes/owner-inbox.ts`
- Modify: `functions/routes/conversations.ts`

**Interfaces:**
- Produces `http/app-user.ts`:

```ts
export interface AppUserRequest {
  authUserId: string
  pool: Pool
  app: AppUserResolution
}

requireAppUser(context: Context): Promise<AppUserRequest>
```

- Consumes: `requireAuth`, `getPool`, `resolveAppUser`.

- [ ] **Step 1: Write the route regression test**

Create `functions/__tests__/routes.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import app from '../api'

const protectedRoutes = [
  ['GET', '/api/me'],
  ['POST', '/api/chat/assistant'],
  ['POST', '/api/chat/assistant/edit'],
  ['POST', '/api/chat/assistant/retry'],
  ['POST', '/api/chat/owner'],
  ['POST', '/api/chat/owner/retry'],
  ['GET', '/api/conversations/assistant'],
  ['GET', '/api/conversations/assistant/messages'],
  ['DELETE', '/api/conversations/00000000-0000-4000-8000-000000000000'],
  ['PATCH', '/api/messages/00000000-0000-4000-8000-000000000000'],
  ['POST', '/api/conversations/owner/read'],
  ['POST', '/api/conversations/owner/unread'],
  ['POST', '/api/conversations/00000000-0000-4000-8000-000000000000/read'],
  ['GET', '/api/owner/threads'],
  ['GET', '/api/owner/threads/00000000-0000-4000-8000-000000000000/messages'],
  ['POST', '/api/owner/threads/00000000-0000-4000-8000-000000000000/messages'],
  ['POST', '/api/owner/threads/00000000-0000-4000-8000-000000000000/read'],
  ['POST', '/api/owner/threads/00000000-0000-4000-8000-000000000000/unread'],
] as const

describe('api routes', () => {
  it('serves health without auth', async () => {
    const response = await app.request('/api/health')
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ ok: true })
  })

  it('handles CORS preflight', async () => {
    const response = await app.request('/api/me', { method: 'OPTIONS' })
    expect(response.status).toBe(204)
  })

  for (const [method, path] of protectedRoutes) {
    it(`${method} ${path} requires auth`, async () => {
      const response = await app.request(path, { method })
      expect(response.status).toBe(401)
    })
  }
})
```

- [ ] **Step 2: Run the route test to confirm the baseline**

Run: `pnpm exec vitest run functions/__tests__/routes.test.ts`
Expected: PASS before refactoring. Missing routes would return 404; this is the guard.

- [ ] **Step 3: Create `requireAppUser`**

```ts
import type { Context } from 'hono'
import type { Pool } from 'pg'
import { requireAuth } from '../chat/auth'
import { getPool } from '../chat/db'
import { type AppUserResolution, resolveAppUser } from '../chat/users'

export interface AppUserRequest {
  authUserId: string
  pool: Pool
  app: AppUserResolution
}

export async function requireAppUser(context: Context): Promise<AppUserRequest> {
  const { authUserId } = await requireAuth(context.req.raw)
  const pool = getPool()
  const app = await resolveAppUser(pool, authUserId)
  return { authUserId, pool, app }
}
```

- [ ] **Step 4: Apply the helper to authenticated route files**

Replace the repeated:

```ts
const { authUserId } = await requireAuth(context.req.raw)
const pool = getPool()
const { user, ... } = await resolveAppUser(pool, authUserId)
```

with:

```ts
const { pool, app } = await requireAppUser(context)
const { user, ... } = app
```

Keep every existing guard call in the same position (`assertOwner`, `assertAiEligible`, `assertAiRateLimits`, `assertAllowedRateLimit`). Apply to all handlers in the five listed route files. Remove now-unused imports.

- [ ] **Step 5: Run tests and typecheck**

Run: `pnpm exec vitest run functions/__tests__/routes.test.ts`
Expected: PASS (19 registrations, 18 protected route entries).

Run: `pnpm typecheck`
Expected: PASS.

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add functions/http/app-user.ts functions/__tests__/routes.test.ts functions/routes/
git commit -m "refactor: add authenticated app-user route helper"
```

---

### Task 6: Split conversation routes and move ownership SQL

**Files:**
- Create: `functions/routes/assistant-history.ts`
- Create: `functions/routes/conversation-messages.ts`
- Create: `functions/routes/message-edit.ts`
- Delete: `functions/routes/conversations.ts`
- Modify: `functions/chat/conversations.ts`
- Modify: `functions/api.ts`
- Test: `functions/__tests__/routes.test.ts`

**Interfaces:**
- Produces `conversations.ts`: `getOwnedConversationById(pool: Pool, userId: string, conversationId: string): Promise<{ id: string }>`; throws `ApiError('NOT_FOUND', 'Conversation not found')` when missing.
- Produces routers: `assistantHistoryRouter`, `conversationMessagesRouter`, `messageEditRouter`.

- [ ] **Step 1: Add `getOwnedConversationById`**

Move the inline query from `routes/conversations.ts` into `chat/conversations.ts`:

```sql
select id from conversations where id = $1 and user_id = $2
```

Return the row or throw the same `NOT_FOUND` error.

- [ ] **Step 2: Create the three routers**

Move the handlers verbatim and keep their existing imports/guards:

`assistant-history.ts`:

- `GET /api/conversations/assistant`
- `DELETE /api/conversations/:id`

`conversation-messages.ts`:

- `GET /api/conversations/:kind/messages` (keep the assistant rolling-deploy fallback and empty page shape)
- `POST /api/conversations/owner/read`
- `POST /api/conversations/owner/unread`
- `POST /api/conversations/:id/read` (use `getOwnedConversationById`)

`message-edit.ts`:

- `PATCH /api/messages/:id`

Export `assistantHistoryRouter`, `conversationMessagesRouter`, and `messageEditRouter`.

- [ ] **Step 3: Rewire `api.ts`**

Replace the old `conversationsRouter` import/mount with the three new routers. Mount order:

```ts
app.route('/', healthRouter)
app.route('/', meRouter)
app.route('/', assistantRouter)
app.route('/', ownerChatRouter)
app.route('/', assistantHistoryRouter)
app.route('/', conversationMessagesRouter)
app.route('/', messageEditRouter)
app.route('/', ownerInboxRouter)
```

Delete `functions/routes/conversations.ts`.

- [ ] **Step 4: Run route test and typecheck**

Run: `pnpm exec vitest run functions/__tests__/routes.test.ts`
Expected: PASS (no 404s).

Run: `pnpm typecheck`
Expected: PASS.

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add functions/routes/assistant-history.ts functions/routes/conversation-messages.ts functions/routes/message-edit.ts functions/routes/conversations.ts functions/chat/conversations.ts functions/api.ts
git commit -m "refactor: split conversation routes by resource"
```

---

### Task 7: Consolidate assistant conversation creation and constants

**Files:**
- Modify: `functions/chat/conversations.ts`
- Modify: `functions/chat/history.ts`
- Modify: `functions/chat/ai-turns.ts`
- Modify: `functions/chat/inbox.ts`
- Modify: `functions/__tests__/history.test.ts`

**Interfaces:**
- Produces `conversations.ts`: `createAssistantConversation(pool: Pool, userId: string): Promise<{ id: string }>`; `getOrCreateConversation('assistant')` delegates to it.
- Removes `createAssistantConversation` from `history.ts`.
- `ai-turns.loadContext` uses `AI_CONTEXT_MESSAGE_LIMIT` from protocol.

- [ ] **Step 1: Move `createAssistantConversation` to `conversations.ts`**

Move the insert verbatim. In `getOrCreateConversation`, replace the assistant branch insert with `return createAssistantConversation(pool, userId)`. Keep owner behavior unchanged.

Update `ai-turns.ts` to import `createAssistantConversation` from `./conversations`. Update `history.test.ts` to import it from `../chat/conversations`. Remove the function from `history.ts`.

- [ ] **Step 2: Remove the `PAGE_SIZE` re-export**

In `inbox.ts`, remove `PAGE_SIZE` from the protocol import and delete `export { PAGE_SIZE }`. No callers exist outside the re-export.

- [ ] **Step 3: Use the context limit constant**

In `ai-turns.ts`, import `AI_CONTEXT_MESSAGE_LIMIT` from protocol and replace the hardcoded `limit 20` with `limit $3`, passing `AI_CONTEXT_MESSAGE_LIMIT` as the third parameter to `loadContext`’s query.

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm exec vitest run functions/__tests__/history.test.ts functions/__tests__/ai.test.ts`
Expected: PASS, including “creates multiple assistant conversations” and turn tests.

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add functions/chat/conversations.ts functions/chat/history.ts functions/chat/ai-turns.ts functions/chat/inbox.ts functions/__tests__/history.test.ts
git commit -m "refactor: consolidate assistant conversation creation"
```

---

### Task 8: Final verification

**Files:**
- Modify: none (fix only unused imports or type errors if the gate flags them)

- [ ] **Step 1: Run the full gate**

Run: `pnpm typecheck`
Expected: PASS.

Run: `pnpm test`
Expected: PASS (DB suites run when `TEST_DATABASE_URL` is configured).

Run: `pnpm lint`
Expected: PASS.

Run: `pnpm build`
Expected: PASS (`tsc -b` includes functions; Vite build succeeds).

- [ ] **Step 2: Verify route inventory**

Run:

```powershell
(Select-String -Pattern "'/api/" -Path functions/routes/*.ts | Measure-Object).Count
```

Expected: `19`.

- [ ] **Step 3: Verify old modules are gone and no raw ownership SQL remains in routes**

Run:

```powershell
Select-String -Pattern "select id from conversations" -Path functions/routes -Recurse
```

Expected: no matches.

Run:

```powershell
Test-Path functions/routes/conversations.ts
```

Expected: `False`.

- [ ] **Step 4: Review the diff**

Confirm the diff contains only moves, extractions, import changes, and the new tests. No route paths, SQL semantics, error strings, SSE payloads, rate limits, or UI code changed.
