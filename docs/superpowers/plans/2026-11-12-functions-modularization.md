# Functions Modularization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `functions/api.ts` (555 lines) into a thin composition root plus `functions/http/` and `functions/routes/` deep Modules with no behavior change.

**Architecture:** Pure move-only refactor. Extract shared guards/SSE helpers first, then one route domain per task as a Hono router Module with a small Interface (`router`). `functions/api.ts` becomes composition root that mounts routers and owns CORS + `onError`. No logic edits, no new deps, no schema changes.

**Tech Stack:** Hono 4, TypeScript, `pg` Pool, Zod 4, Vitest 5.1.0, Biome 2.6.6, pnpm.

**Spec:** Current behavior in `functions/api.ts` (555 lines) + `functions/chat/*.ts` (14 modules). Preserve every route path, status code, error code, SSE event shape, rate-limit value, and CORS behavior.

## Global Constraints

- Move-only. Do not change route paths, JSON shapes, status codes, error codes/messages, SSE `meta`/`delta`/`done`/`error` payloads, rate-limit numbers (5/min 30/day assistant, 10/min 60/day owner/edit, 20/min 1000/day global), CORS allowed methods/headers, or SQL.
- `functions/api.ts` default export stays a Hono app. No caller changes.
- Routers import from `../chat/*` and `../../src/lib/chat/protocol` with existing relative paths. No barrel files.
- Each route Module has exactly one Interface: its exported router. Tests cross the same Seam (HTTP) as callers.
- Run `pnpm typecheck` and `pnpm test` (vitest run) after every task. Both must pass before commit.
- One commit per task. No worktree or branch. Work in current checkout.

## Review Focus

- `POST /api/chat/owner` and `POST /api/chat/owner/retry` currently duplicate the handler body — deduped handler must return identical `{ message }` JSON and identical rate limits.
- `GET /api/conversations/:kind/messages` assistant branch has rolling-deploy fallback (no `conversationId` → latest or empty page) — fallback must survive the move verbatim.
- `POST /api/chat/assistant*` streaming path must keep `meta` first, `delta` chunks, `done`/`error` terminal events, 15s heartbeat, `AbortController` wiring, and `markAssistantFailed` on throw.
- Owner guards (`assertOwner`, `assertAiEligible`, `assertAiRateLimits`) must stay on the same routes with the same 403/429 codes and `Retry-After` header.
- CORS preflight (`OPTIONS` → 204 + headers) and `onError` → `toApiError` mapping must stay in the composition root only.

---

### Task 1: Extract shared HTTP Modules (guards + SSE)

**Files:**
- Create: `functions/http/guards.ts`
- Create: `functions/http/sse.ts`
- Modify: `functions/api.ts` (replace local helpers with imports, no route changes)
- Test: existing suite as regression gate (no new test file; `functions/__tests__/` covers `chat/` callees)

**Interfaces:**
- Consumes: `getPool` type from `../chat/db`, `RateLimitResult` from `../chat/rate-limit`, `ApiError` from `../chat/errors`, `AssistantTurn` + `runAssistantTurn` + `markAssistantFailed` from `../chat/ai`, `OpenRouterGateway` from `../chat/openrouter`.
- Produces:
  - `guards.ts`: `assertAllowedRateLimit(context: Context, result: RateLimitResult): void`, `assertAiEligible(input: { aiEligible: boolean; aiReason: string }): void`, `assertOwner(isOwner: boolean): void`, `assertAiRateLimits(context: Context, pool: ReturnType<typeof getPool>, userId: string): Promise<void>`
  - `sse.ts`: `streamTurn(context: Context, pool: ReturnType<typeof getPool>, turn: AssistantTurn, gateway: OpenRouterGateway): Promise<Response>`

- [ ] **Step 1: Write failing import check**

Run: `pnpm exec tsc -b --pretty false 2>&1 | head -n 20`
Expected: PASS on clean tree (baseline; the "fail" is that `functions/http/guards.ts` and `functions/http/sse.ts` do not exist yet — confirm with `ls functions/http` returning "not found").

- [ ] **Step 2: Create `functions/http/guards.ts`**

Move `assertAllowedRateLimit`, `assertAiEligible`, `assertOwner`, `assertAiRateLimits` from `functions/api.ts:61-112` verbatim (including rate-limit numbers 5/30 and `consumeGlobalAiLimit` call). Imports only from `../chat/*`. No logic edits.

- [ ] **Step 3: Create `functions/http/sse.ts`**

Move `streamTurn` from `functions/api.ts:114-192` verbatim (heartbeat 15s, `meta`/`delta`/`done`/`error` events, `markAssistantFailed` on catch). Imports `streamSSE` from `hono/streaming` plus `../chat/*`.

- [ ] **Step 4: Rewire `functions/api.ts` to consume the new Modules**

Delete the moved function bodies, add `import { assertAiEligible, assertAiRateLimits, assertAllowedRateLimit, assertOwner } from './http/guards'` and `import { streamTurn } from './http/sse'`. No route-body changes.

- [ ] **Step 5: Run typecheck + full tests**

Run: `pnpm typecheck`
Expected: PASS (exit 0).

Run: `pnpm test`
Expected: PASS (all `functions/__tests__/*` pass; count matches baseline).

- [ ] **Step 6: Commit**

```bash
git add functions/http/guards.ts functions/http/sse.ts functions/api.ts
git commit -m "refactor: extract http guards and sse helpers"
```

---

### Task 2: Extract health + me + CORS/error composition shape

**Files:**
- Create: `functions/routes/health.ts`
- Create: `functions/routes/me.ts`
- Modify: `functions/api.ts` (mount new routers; keep CORS middleware + `onError` in root)
- Test: `pnpm test` + manual route grep

**Interfaces:**
- Consumes: `getPool`, `requireAuth`, `resolveAppUser`, `countUserOwnerUnread` (me only).
- Produces:
  - `health.ts`: `export const healthRouter: Hono` serving `GET /api/health → { ok: true }`
  - `me.ts`: `export const meRouter: Hono` serving `GET /api/me → { user, isOwner, aiEligible, aiReason, ownerUnreadCount }`

- [ ] **Step 1: Create `functions/routes/health.ts`**

```typescript
import { Hono } from 'hono'
export const healthRouter = new Hono().get('/api/health', (c) => c.json({ ok: true }))
```

- [ ] **Step 2: Create `functions/routes/me.ts`**

Move `app.get('/api/me', …)` body from `functions/api.ts:208-226` verbatim into `meRouter`. Keep `requireAuth → getPool → resolveAppUser → countUserOwnerUnread → json` order.

- [ ] **Step 3: Mount routers in `functions/api.ts`**

Add `import { healthRouter } from './routes/health'` / `meRouter`, replace the two inline handlers with `app.route('/', healthRouter)` and `app.route('/', meRouter)`. CORS `app.use('*', …)` and `app.onError` stay in `api.ts` untouched.

- [ ] **Step 4: Verify no duplicate registration**

Run: `pnpm exec grep -rn "api/health\|api/me" functions/`
Expected: exactly one definition per path (in `routes/`) plus one `app.route` line per router in `api.ts`.

Run: `pnpm typecheck && pnpm test`
Expected: PASS both.

- [ ] **Step 5: Commit**

```bash
git add functions/routes/health.ts functions/routes/me.ts functions/api.ts
git commit -m "refactor: extract health and me routes"
```

---

### Task 3: Extract assistant chat routes (send / edit / retry)

**Files:**
- Create: `functions/routes/assistant.ts`
- Modify: `functions/api.ts` (mount router, delete inline handlers)
- Test: `pnpm test` + grep

**Interfaces:**
- Consumes: `parseBody` + `assistantSendSchema/assistantEditSchema/assistantRetrySchema` from `../../src/lib/chat/protocol`, `requireAuth`, `getPool`, `resolveAppUser`, `findAssistantConversationByClientId/getLatestAssistantConversation/getOwnedAssistantConversation`, `beginAssistantTurn/beginAssistantEdit/beginAssistantRetry`, `createOpenRouterGateway`, `assertAiEligible/assertAiRateLimits` (Task 1), `streamTurn` (Task 1).
- Produces: `export const assistantRouter: Hono` serving `POST /api/chat/assistant`, `POST /api/chat/assistant/edit`, `POST /api/chat/assistant/retry` (all return `streamTurn(...)`).

- [ ] **Step 1: Create `functions/routes/assistant.ts` with the three handlers moved verbatim**

Move bodies from `functions/api.ts:428-490` unchanged, including the `conversationId` resolution fallback (`findByClientId ?? getLatest ?? undefined` → `getOwnedAssistantConversation` guard) and the `assertAiRateLimits` call before `createOpenRouterGateway`.

- [ ] **Step 2: Mount in `functions/api.ts`**

Replace the three inline `app.post(...)` blocks with `app.route('/', assistantRouter)`. Delete now-unused imports (`assistantSendSchema`, `beginAssistantTurn`, etc.) from `api.ts` only if unused elsewhere in the file.

- [ ] **Step 3: Verify**

Run: `pnpm exec grep -rn "api/chat/assistant" functions/`
Expected: definitions only in `routes/assistant.ts`, one mount line in `api.ts`.

Run: `pnpm typecheck && pnpm test`
Expected: PASS both.

- [ ] **Step 4: Commit**

```bash
git add functions/routes/assistant.ts functions/api.ts
git commit -m "refactor: extract assistant chat routes"
```

---

### Task 4: Extract owner-chat + conversations/messages routes

**Files:**
- Create: `functions/routes/owner-chat.ts`
- Create: `functions/routes/conversations.ts`
- Modify: `functions/api.ts` (mount both)
- Test: `pnpm test` + grep

**Interfaces:**
- Consumes: `sendMessageSchema/ownerRetrySchema/chatKindSchema/paginationSchema/assistantHistoryQuerySchema/assistantMessagesQuerySchema/threadPaginationSchema/editMessageSchema` + `z`, `getOrCreateConversation/createMessage/editMessage/listMessages/markRead`, `listAssistantConversations/getLatestAssistantConversation/getOwnedAssistantConversation/deleteAssistantConversation`, `consumeUserRateLimit`, guards from Task 1.
- Produces:
  - `owner-chat.ts`: `export const ownerChatRouter: Hono` serving `POST /api/chat/owner`, `POST /api/chat/owner/retry` via one shared `handleOwnerSend` (dedupe: the two current bodies are identical — one internal function, two route registrations).
  - `conversations.ts`: `export const conversationsRouter: Hono` serving `GET /api/conversations/assistant`, `GET /api/conversations/:kind/messages`, `DELETE /api/conversations/:id`, `PATCH /api/messages/:id`, `POST /api/conversations/owner/read`, `POST /api/conversations/owner/unread`, `POST /api/conversations/:id/read`.

- [ ] **Step 1: Create `functions/routes/owner-chat.ts` with deduped handler**

Move the `POST /api/chat/owner` body verbatim into `async function handleOwnerSend(context)` (auth → `parseBody(sendMessageSchema)` → `consumeUserRateLimit(owner_send 10/min 60/day)` → `getOrCreateConversation(owner)` → `createMessage`), register it for both `/api/chat/owner` and `/api/chat/owner/retry` (retry keeps parsing `ownerRetrySchema` — both schemas have identical `{ body, clientId }` shape; keep each route's own schema parse, share the remainder).

- [ ] **Step 2: Create `functions/routes/conversations.ts`**

Move the seven handlers verbatim, preserving: assistant-history query parse, `:kind/messages` assistant-vs-owner branch including the rolling-deploy empty-page fallback (`messages: [], hasMore: false, nextCursor: null`), `DELETE :id` uuid parse + `assertAiEligible`, `PATCH /api/messages/:id` edit with `allowOwner`, and the three read/unread posts including the raw `select id from conversations` guard in `POST /api/conversations/:id/read`.

- [ ] **Step 3: Mount in `functions/api.ts`**

Replace moved blocks with `app.route('/', ownerChatRouter)` + `app.route('/', conversationsRouter)`.

- [ ] **Step 4: Verify**

Run: `pnpm exec grep -rn "api/chat/owner\|api/conversations\|api/messages" functions/api.ts functions/routes/`
Expected: zero inline definitions left in `api.ts`; definitions only in the two new files.

Run: `pnpm typecheck && pnpm test`
Expected: PASS both.

- [ ] **Step 5: Commit**

```bash
git add functions/routes/owner-chat.ts functions/routes/conversations.ts functions/api.ts
git commit -m "refactor: extract owner-chat and conversations routes"
```

---

### Task 5: Extract owner-inbox routes

**Files:**
- Create: `functions/routes/owner-inbox.ts`
- Modify: `functions/api.ts` (mount router)
- Test: `pnpm test` + grep

**Interfaces:**
- Consumes: `threadPaginationSchema/paginationSchema/sendMessageSchema`, `requireAuth`, `getPool`, `resolveAppUser`, `listOwnerThreads/getOwnerThreadMessages/createOwnerReply/markOwnerRead/markOwnerUnread`, `consumeUserRateLimit`, `assertOwner/assertAllowedRateLimit`.
- Produces: `export const ownerInboxRouter: Hono` serving `GET /api/owner/threads`, `GET /api/owner/threads/:userId/messages`, `POST /api/owner/threads/:userId/messages`, `POST /api/owner/threads/:userId/read`, `POST /api/owner/threads/:userId/unread`.

- [ ] **Step 1: Create `functions/routes/owner-inbox.ts`**

Move the five handlers verbatim. Keep `assertOwner` before every handler and `consumeUserRateLimit(owner_send 10/60)` on the POST-messages route.

- [ ] **Step 2: Mount in `functions/api.ts`**

Replace moved blocks with `app.route('/', ownerInboxRouter)`.

- [ ] **Step 3: Verify file is now a thin composition root**

Run: `pnpm exec wc -l functions/api.ts && pnpm exec grep -c "app\.\(get\|post\|patch\|delete\)" functions/api.ts`
Expected: `api.ts` under ~80 lines, zero direct `app.get/post/patch/delete` route definitions (only `app.use`, `app.route`, `app.onError`, default export).

Run: `pnpm typecheck && pnpm test`
Expected: PASS both.

- [ ] **Step 4: Commit**

```bash
git add functions/routes/owner-inbox.ts functions/api.ts
git commit -m "refactor: extract owner-inbox routes"
```

---

### Task 6: Final verification (composition root review)

**Files:**
- Modify: none (verification only; fix only unused imports in `functions/api.ts` / `functions/routes/*` if typecheck flags them)
- Test: full gate

**Interfaces:**
- Consumes: final `functions/api.ts` + all routers from Tasks 1–5.
- Produces: clean `pnpm typecheck`, `pnpm test`, `pnpm lint` and a sub-80-line `api.ts`.

- [ ] **Step 1: Read the final composition root**

Read `functions/api.ts` in full. Confirm it contains only: Hono creation, CORS middleware, six `app.route` mounts, `onError`, default export. Confirm no business logic, no SQL, no rate-limit numbers remain.

- [ ] **Step 2: Run the full gate**

Run: `pnpm typecheck`
Expected: PASS.

Run: `pnpm test`
Expected: PASS (all suites green).

Run: `pnpm lint`
Expected: PASS (no new Biome violations; fix unused imports if flagged).

- [ ] **Step 3: Final route inventory**

Run: `pnpm exec grep -rhn "api/\|api\." functions/routes functions/http | sort`
Expected: all 17 pre-existing route paths present exactly once across `routes/` (1 health + 1 me + 3 assistant + 2 owner-chat + 7 conversations + 5 owner-inbox = 19 registrations covering 17 unique paths with the owner retry + conversation read variants).

---

## Self-Review

1. **Spec coverage:** every `app.*` handler in the original `api.ts:206-548` has an owning task (health+me → T2, assistant ×3 → T3, owner-chat ×2 + conversations ×7 → T4, owner-inbox ×5 → T5, helpers → T1, root → T6). CORS + `onError` stay in root. Covered.
2. **Step scan:** each step names one file, one action, one checkable command. Test steps name the exact command and expected output. No "handle edge cases" placeholders.
3. **Type consistency:** `AssistantTurn`, `OpenRouterGateway`, `ReturnType<typeof getPool>`, `Context` type names match the current `api.ts` imports. Router export names (`healthRouter`, `meRouter`, `assistantRouter`, `ownerChatRouter`, `conversationsRouter`, `ownerInboxRouter`) are used identically in creation and mount steps.
4. **Review Focus:** the five riskiest silent inputs (owner-send dedupe, rolling-deploy fallback, SSE event order, guard placement, CORS/onError) each have an explicit preservation line in the owning task plus a grep/typecheck/test verification step.
5. **Proportion:** plan is ~200 lines describing moves for ~555 lines of source. No function bodies transcribed except the one-line health router and the dedupe note whose shared shape is already proven by the two identical current bodies. Signatures + file paths carry the decisions.
