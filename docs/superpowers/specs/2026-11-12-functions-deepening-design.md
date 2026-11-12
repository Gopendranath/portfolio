# Functions Deepening — Design

Date: 2026-11-12
Status: Approved
Scope: Targeted second-pass modularization of `functions/`

## Intent

Reduce duplicated transaction code, duplicated message-write SQL, route boilerplate, and one hidden read-path write — without changing behavior, route contracts, SQL semantics, or folder-wide organization.

The first pass already split `api.ts` into routers and split `ai.ts` / `conversations.ts`. This pass targets the remaining design problems, not file size.

## Current problems

| File | Lines | Problem |
|---|---:|---|
| `chat/ai-turns.ts` | 262 | Three turn flows own transactions, ownership checks, context assembly, and raw message SQL. |
| `chat/messages.ts` | 202 | Message CRUD plus revision/supersede SQL; `listMessages` mutates stale streams. |
| `chat/history.ts` | 236 | Conversation lifecycle, title logic, cursor pagination; duplicate assistant-conversation creation. |
| `routes/conversations.ts` | 149 | Seven handlers, repeated auth/pool/user boilerplate, inline SQL for ownership. |

## Goals

- One transaction helper for the four straightforward transaction sites.
- One message-write module owning revision/supersede/assistant-placeholder SQL sequences.
- Separate stale-stream repair from the pure message list query.
- One HTTP helper for `requireAuth → getPool → resolveAppUser`.
- Split `routes/conversations.ts` by resource and move its inline SQL into the conversation repository.
- Remove duplicate assistant-conversation creation and the `PAGE_SIZE` re-export.
- Preserve all behavior and existing tests.

## Non-goals

- No folder-wide `platform/` or `integrations/` reorganization.
- No split of `history.ts`, `inbox.ts`, or `rate-limit.ts` by line count.
- No rate-limit transaction refactor. Its callback intentionally rolls back on a denied decision; forcing it through `withTransaction` adds complexity.
- No route, status code, error code/message, SSE event, rate-limit value, SQL, or schema changes.
- No UI changes.
- No new product behavior.

## Approaches considered

### A. Targeted deepening (chosen)

Keep the current flat `functions/` layout. Extract only seams that pass the deletion test: transaction helper, message-write sequences, read use case, auth helper, and route split.

### B. Full folder reorganization

A plus moving auth/cors/db/errors/rate-limit/validation into `platform/` and GitHub/OpenRouter into `integrations/`. Better discoverability, but ~25 file moves and high import churn for no behavior change.

### C. Aggressive split

B plus splitting history/inbox/rate-limit into small files. Rejected: their public interfaces are already small; splitting would create shallow modules.

## Chosen design

### 1. `chat/db.ts`: add `withTransaction`

```ts
withTransaction<T>(
  pool: Pool,
  work: (client: PoolClient) => Promise<T>,
): Promise<T>
```

Owns `connect → begin → work → commit → rollback → release`. Used by:

- `messages.createMessage`
- `messages.editMessage`
- `ai-turns.beginAssistantEdit`
- `ai-turns.beginAssistantRetry`

Callbacks must not commit or rollback. Post-commit work (`retitleAssistantConversation`, `loadContext`, DTO mapping) stays outside the helper.

### 2. `chat/message-writes.ts`: transactional message-write sequences

One deep module owning the SQL sequences shared by message editing and assistant turns.

Public interface:

```ts
interface LockedMessage {
  id: string
  body: string
  author: ChatAuthor
  conversationId: string
  seq: number
  status: MessageStatus
  userId: string
  kind: 'owner' | 'assistant'
}

lockMessageForUpdate(client, messageId): Promise<LockedMessage | undefined>
lockRetryTarget(client, messageId): Promise<LockedMessage | undefined>

writeUserEdit(client, {
  message: LockedMessage
  body: string
  editorUserId: string
  now: Date
}): Promise<MessageRow>

writeAssistantEdit(client, {
  message: LockedMessage
  body: string
  editorUserId: string
  now: Date
  model: string
}): Promise<{ edited: MessageRow; assistant: MessageRow }>

writeAssistantRetry(client, {
  failed: LockedMessage
  userMessage: MessageRow
  now: Date
  model: string
}): Promise<MessageRow>
```

Internal behavior, preserving current SQL:

- `writeUserEdit`: insert revision, update body, touch conversation `updated_at` only.
- `writeAssistantEdit`: insert revision, update body, mark later messages superseded/soft-deleted, insert streaming assistant placeholder, touch conversation activity.
- `writeAssistantRetry`: supersede/soft-delete failed message, insert streaming assistant placeholder, touch conversation activity.
- `lockMessageForUpdate` filters `deleted_at is null`; `lockRetryTarget` keeps current retry behavior (no deleted filter).
- Conversation timestamp semantics stay exactly as today: `messages.editMessage` updates only `updated_at`; assistant edit/retry update `updated_at` and `last_message_at`; `createMessage` keeps its existing `greatest(last_message_at, created_at)` behavior.

`ai-turns.ts` keeps ownership policy and context assembly. `messages.editMessage` keeps its edit-permission policy. Neither keeps the duplicated write SQL.

### 3. `chat/stale-streams.ts` + `chat/message-page.ts`

- `stale-streams.ts`: `markStaleStreamingMessagesFailed(pool, conversationId, now?)` owns the stale-stream update currently inside `listMessages`.
- `message-page.ts`: `getMessagePage(pool, conversationId, options)` repairs stale streams, then returns `listMessages(...)`.
- `messages.listMessages` becomes a pure read.
- Message-read callers use `getMessagePage`: conversation-messages route and owner inbox.
- Stale-stream behavior stays identical: streaming rows older than two minutes are marked failed with `STALE_STREAM`.

This keeps the repair use case behind one interface instead of hiding a write inside a query function.

### 4. `http/app-user.ts`: authenticated app-user helper

```ts
requireAppUser(context): Promise<{
  authUserId: string
  pool: Pool
  app: AppUserResolution
}>
```

Order preserved: `requireAuth → getPool → resolveAppUser`. Guards stay explicit at route level (`assertOwner`, `assertAiEligible`, `assertAiRateLimits`, `assertAllowedRateLimit`). Applied to all authenticated routes in:

- `routes/me.ts`
- `routes/assistant.ts`
- `routes/owner-chat.ts`
- `routes/owner-inbox.ts`
- the split conversation routes

### 5. Split `routes/conversations.ts`

Create three routers; mount all in `api.ts`:

| New router | Paths |
|---|---|
| `routes/assistant-history.ts` | `GET /api/conversations/assistant`, `DELETE /api/conversations/:id` |
| `routes/conversation-messages.ts` | `GET /api/conversations/:kind/messages`, `POST /api/conversations/owner/read`, `POST /api/conversations/owner/unread`, `POST /api/conversations/:id/read` |
| `routes/message-edit.ts` | `PATCH /api/messages/:id` |

Move the inline `select id from conversations where id = $1 and user_id = $2` query into `chat/conversations.ts` as `getOwnedConversationById(pool, userId, conversationId)`. Keep the same `NOT_FOUND` error and message.

### 6. Consistency cleanup

- Move `createAssistantConversation` from `history.ts` to `conversations.ts`; `getOrCreateConversation('assistant')` delegates to it. Update `ai-turns.ts` and history tests. Behavior stays “assistant always creates; owner is unique per user.”
- Remove `export { PAGE_SIZE }` from `inbox.ts`; no callers.
- Use `AI_CONTEXT_MESSAGE_LIMIT` instead of hardcoded `limit 20` in `ai-turns.loadContext`.

## Behavior invariants

- Every route path, method, status code, JSON shape, error code/message, and SSE payload stays unchanged.
- Assistant send/edit/retry ordering stays: auth → eligibility → rate limits → gateway creation → turn begin → stream.
- Assistant edit still forks: revisions are recorded, later messages are superseded/soft-deleted, a new streaming assistant placeholder is created, and retitle runs only when the earliest visible user message changes.
- Assistant retry still requires a failed assistant message owned by the user and a prior user message.
- Owner inbox read/unread and unread counts keep current semantics.
- Stale streams still repair on message reads.
- No SQL schema or migration changes.

## Verification

- `pnpm typecheck`
- `pnpm test` (DB suites run only when `TEST_DATABASE_URL` is set)
- `pnpm lint`
- Route inventory: 19 registrations covering 17 unique paths.
- Review diff for moves/extractions only; no behavior edits.

## Risks

- Route split can drop a handler. Mitigation: route inventory plus explicit mount list.
- `withTransaction` can change commit timing if post-commit work moves inside. Mitigation: callbacks return data; retitle/context/DTO mapping stay outside.
- Message-write extraction can change revision/supersede order. Mitigation: preserve sequence and rely on existing AI/conversation tests.
- `getMessagePage` can be bypassed by a future caller. Mitigation: update every current message-read caller; keep the stale test as a regression gate.
- Moving `createAssistantConversation` can accidentally change assistant reuse semantics. Mitigation: keep always-create behavior; history test “creates multiple assistant conversations” is the gate.

## What stays

- `history.ts` keeps history listing, cursors, titles, ownership, latest lookup, delete.
- `inbox.ts` keeps owner thread read model and actions.
- `rate-limit.ts` keeps its two transaction flows.
- `users.ts`, `github.ts`, `prompt.ts`, `ai-stream.ts`, `openrouter.ts`, `auth.ts`, `cors.ts`, `errors.ts`, `validation.ts` stay as-is.
- Current flat `functions/chat/` convention and no barrel files.
