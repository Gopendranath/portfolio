# Portfolio Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working two-thread portfolio chat: GitHub-authenticated owner messaging plus an age-gated, streaming AI assistant backed by Neon Postgres, Neon Auth, Neon Functions, and OpenRouter's free router.

**Architecture:** A Vite SPA calls a Neon Function directly with a Neon Auth JWT. The function verifies the JWT, enforces ownership, age, validation, and rate limits, reads/writes Postgres, and streams OpenRouter tokens as SSE. Owner threads are two-way; assistant threads are private to each visitor.

**Tech Stack:** React 19, TypeScript, Vite 8, TanStack Query, Neon Postgres, Neon Auth (`@neon/auth`), Neon Functions (Hono, Node 24, `pg`), OpenRouter (`openai` SDK), Zod, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-12-portfolio-chat-design.md`

## Global Constraints

- GitHub numeric owner id: `71755844`; login `Gopendranath`.
- Neon project region: `aws-ap-southeast-1` (Singapore).
- AI model: exactly `openrouter/free`; no paid fallback.
- OpenRouter key: 30-day expiry, `$0.00` credit limit.
- Input: 1–2,000 characters, NFC normalized, no control chars except `\n` and `\t`.
- AI output: `max_tokens: 1200`, hard stop at 6,000 characters.
- AI context: last 20 complete, non-deleted messages; 12,000-character cap.
- AI quota: 5/min and 30/day per user; global 20/min and 1,000/day.
- Owner quota: 10/min and 60/day per user.
- History page size: 10.
- Only GitHub accounts with `created_at <= now - 365 days` may use AI.
- Owner inbox shows `kind = 'owner'` only.
- No email, Data API, Realtime, RLS, file uploads, or anonymous posting.
- Secrets never enter `src/` or any committed file.
- Keep the existing visual language and chat layout.

## Review Focus

- A visitor edits an old AI prompt: later answers must disappear and a fresh answer must stream, never leave stale context.
- A stream aborts or OpenRouter fails mid-flight: no permanent `streaming` row; the UI must offer retry.
- A user sends the same `clientId` twice after a network timeout: exactly one message row.
- An under-1-year or unverifiable GitHub account calls the AI endpoint directly: server returns 403, regardless of UI.
- A signed-in visitor requests another visitor's owner thread or message: server returns 404/403, regardless of guessed ids.

---

### Task 1: Neon project, Auth, GitHub OAuth, OpenRouter key

**Files:**
- Create: `.env.example`
- Modify: `.env.local` (gitignored)
- Create: `neon.ts`

**Interfaces:**
- Produces: `VITE_NEON_AUTH_URL`, `VITE_CHAT_API_URL`, `OPENROUTER_API_KEY`, `OWNER_GITHUB_ID`, `CORS_ORIGINS` in `.env.local`.
- Produces: Neon Auth base URL and JWKS URL; GitHub OAuth app credentials configured in Neon Auth.
- Produces: committed `neon.ts` declaring `auth: true` and function `api` at `functions/api.ts`.

- [ ] **Step 1: Create the Neon project**

Use the Neon Console or `npx neon projects create`. Project name `portfolio-chat`, region `aws-ap-southeast-1`, database `neondb`, branch `main`. Record the project id and branch id in `.env.local` as comments only.

- [ ] **Step 2: Enable Neon Auth**

Enable Managed Better Auth on `main`. Copy:
- `NEON_AUTH_BASE_URL`
- `NEON_AUTH_JWKS_URL`

Add public mirrors to `.env.local`: `VITE_NEON_AUTH_URL` equals `NEON_AUTH_BASE_URL`.

- [ ] **Step 3: Create GitHub OAuth app**

GitHub → Settings → Developer settings → OAuth Apps → New OAuth App:
- Name: `Portfolio Chat`
- Homepage: `https://gopendra.is-a.dev`
- Callback: `{NEON_AUTH_BASE_URL}/callback/github`

Copy the client id and secret. Add them to Neon Auth's GitHub provider for the `main` branch. Save backup values in `.env.local` as `GITHUB_OAUTH_CLIENT_ID` and `GITHUB_OAUTH_CLIENT_SECRET`.

- [ ] **Step 4: Configure trusted domains**

Add `http://localhost:5173`, `https://gopendra.is-a.dev`, and the current Vercel production alias (`https://portfolio-zeta-coral-18.vercel.app`) to Neon Auth trusted domains.

- [ ] **Step 5: Create OpenRouter key**

OpenRouter → Keys → New key:
- Name: `portfolio-chat-prod`
- Expiration: `30 days`
- Credit limit: `$0.00`

Copy the key to `.env.local` as `OPENROUTER_API_KEY`. Do not paste it into any tracked file.

- [ ] **Step 6: Write `neon.ts`**

```ts
import { defineConfig } from '@neon/config/v1'

export default defineConfig({
  auth: true,
  functions: {
    api: {
      name: 'Portfolio Chat API',
      source: './functions/api.ts',
      env: {
        OPENROUTER_API_KEY: { value: process.env.OPENROUTER_API_KEY, required: true },
        OWNER_GITHUB_ID: { value: process.env.OWNER_GITHUB_ID ?? '71755844', required: true },
        CORS_ORIGINS: {
          value:
            process.env.CORS_ORIGINS ??
            'http://localhost:5173,https://gopendra.is-a.dev,https://portfolio-zeta-coral-18.vercel.app',
          required: true,
        },
      },
    },
  },
})
```

- [ ] **Step 7: Write `.env.example`**

List every variable name with empty values, including `VITE_NEON_AUTH_URL`, `VITE_CHAT_API_URL`, `OPENROUTER_API_KEY`, `OWNER_GITHUB_ID`, `CORS_ORIGINS`, `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`, `NEON_API_KEY`.

- [ ] **Step 8: Verify secrets are ignored**

Run: `git check-ignore -v .env.local`
Expected: `.env.local` matched by `.env*`.

- [ ] **Step 9: Commit**

```bash
git add neon.ts .env.example
git commit -m "chore(chat): scaffold neon config and env names"
```

---

### Task 2: Database schema and migration runner

**Files:**
- Create: `db/migrations/001_chat.sql`
- Create: `scripts/migrate.mjs`
- Modify: `package.json` (`db:migrate` script)
- Test: `scripts/__tests__/migrate.test.mjs` (optional smoke; skip if no local DB)

**Interfaces:**
- Produces tables: `app_users`, `conversations`, `messages`, `message_revisions`, `rate_limit_events`, `ai_usage`, `global_ai_usage`, `schema_migrations`.
- Produces `messages.seq bigserial` and index `(conversation_id, seq desc)`.
- Produces check constraint `char_length(body) between 1 and 2000`.

- [ ] **Step 1: Write `001_chat.sql`**

Use `create extension if not exists pgcrypto;`. Create the seven tables exactly as the spec defines. Include:
- `app_users.auth_user_id text unique not null`, `github_id bigint unique not null`, `role text not null default 'user' check (role in ('user','owner'))`.
- `conversations.kind text not null check (kind in ('owner','assistant'))`, unique `(user_id, kind)`.
- `messages.seq bigserial unique not null`, `author` and `status` checks, `body` length check, unique `(conversation_id, client_id)` partial index.
- `messages` index `(conversation_id, seq desc)`.
- `message_revisions` index `(message_id, edited_at desc)`.
- `rate_limit_events` index `(user_id, action, created_at desc)`.
- `ai_usage` primary key `(user_id, day)`.
- `global_ai_usage` primary key `(window_start, window_kind)`.
- `schema_migrations (name text primary key, applied_at timestamptz not null default now())`.

- [ ] **Step 2: Write the migration runner**

`scripts/migrate.mjs`:
- Read SQL files from `db/migrations` sorted by name.
- Connect with `pg` using `process.env.DATABASE_URL`.
- For each file not in `schema_migrations`, run it inside a transaction and insert its name.
- Close the pool; exit non-zero on failure.

- [ ] **Step 3: Add script**

```json
"db:migrate": "node --env-file=.env.local scripts/migrate.mjs"
```

- [ ] **Step 4: Pull the branch env and run the migration**

Run:
```bash
npx neon link
npx neon env pull
pnpm db:migrate
```
Expected: migration applies once; rerunning is a no-op.

- [ ] **Step 5: Verify schema**

Run a `psql` or Node query listing the tables and `messages` columns. Expected: all seven tables and `seq` present.

- [ ] **Step 6: Commit**

```bash
git add db/migrations/001_chat.sql scripts/migrate.mjs package.json
git commit -m "feat(db): add chat schema and migration runner"
```

---

### Task 3: Shared chat protocol and validation

**Files:**
- Create: `src/lib/chat/protocol.ts`
- Create: `functions/chat/validation.ts`
- Test: `src/lib/chat/__tests__/protocol.test.ts`
- Test: `functions/__tests__/validation.test.ts`

**Interfaces:**
- Produces `ChatKind = 'owner' | 'assistant'`
- Produces `MessageStatus = 'complete' | 'streaming' | 'failed' | 'superseded'`
- Produces `ChatMessageViewStatus = MessageStatus | 'sending'` for optimistic client messages.
- Produces `ChatMessageDTO` with `id`, `seq`, `author`, `body`, `status`, `sentAt` (ISO string), `editedAt` (ISO string | null), `clientId` (string | null).
- Produces Zod schemas: `sendMessageSchema`, `editMessageSchema`, `retrySchema`, `paginationSchema`.
- Produces `normalizeBody(input: string): string`.
- Produces `MAX_MESSAGE_LENGTH = 2000`, `MAX_AI_OUTPUT_CHARS = 6000`, `PAGE_SIZE = 10`.

- [ ] **Step 1: Write failing protocol tests**

Test:
- `normalizeBody('  hello  ')` → `'hello'`.
- `normalizeBody('a\u0000b')` throws `VALIDATION`.
- `normalizeBody('x'.repeat(2001))` throws `VALIDATION`.
- `sendMessageSchema` rejects missing/empty `clientId` and accepts a 36-char UUID.
- `paginationSchema` defaults `limit` to 10 and rejects `limit > 10`.
- `editMessageSchema` rejects `body` over 2,000 chars.

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm test src/lib/chat/__tests__/protocol.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement protocol**

Use `zod` v4. Keep it DOM-free and safe for both Vite and the function. Export types inferred from schemas. `normalizeBody` trims, NFC-normalizes, rejects control characters with `\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F`, and enforces the 2,000-character limit.

- [ ] **Step 4: Add function-side `parseBody`**

`parseBody(schema, request)` reads at most 16 KB, rejects non-JSON content types, parses, and returns the typed value or throws `ApiError('VALIDATION', ...)`.

- [ ] **Step 5: Run tests**

Run: `pnpm test src/lib/chat/__tests__/protocol.test.ts functions/__tests__/validation.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/chat/protocol.ts functions/chat/validation.ts src/lib/chat/__tests__ functions/__tests__
git commit -m "feat(chat): add shared protocol and validation"
```

---

### Task 4: Function bootstrap, errors, JWT auth, and `/api/me`

**Files:**
- Create: `functions/api.ts`
- Create: `functions/chat/errors.ts`
- Create: `functions/chat/auth.ts`
- Create: `functions/chat/db.ts`
- Create: `functions/chat/cors.ts`
- Test: `functions/__tests__/auth.test.ts`
- Test: `functions/__tests__/errors.test.ts`
- Modify: `package.json` (dependencies/scripts)
- Modify: `biome.json` (include `functions/**/*.ts`)
- Create: `tsconfig.functions.json`
- Modify: `tsconfig.json` (reference functions)

**Interfaces:**
- Produces `ApiError` with `code: ApiErrorCode`, `status: number`, `retryable: boolean`.
- Produces `requireAuth(c): Promise<{ authUserId: string; token: string }>`.
- Produces `getAppUser(pool, authUserId): Promise<AppUser>`.
- Produces `app` Hono instance exported default from `functions/api.ts`.
- Produces `GET /api/health` and `GET /api/me`.

- [ ] **Step 1: Install dependencies**

```bash
pnpm add hono pg jose zod openai @neon/auth @neon/config @neon/functions
pnpm add -D @types/pg
```

- [ ] **Step 2: Write failing auth/error tests**

Mock JWKS verification. Test:
- missing `Authorization` → `UNAUTHORIZED` 401.
- bad token → `UNAUTHORIZED` 401.
- valid token with `sub` → returns `authUserId`.
- `ApiError` serializes to `{ error: { code, message, retryable } }`.

- [ ] **Step 3: Implement errors and auth**

`ApiError extends Error` with helper factories. `requireAuth`:
- reads `Authorization: Bearer`.
- `createRemoteJWKSet(new URL(process.env.NEON_AUTH_JWKS_URL!))` once at module scope.
- `jwtVerify(token, jwks, { issuer: new URL(process.env.NEON_AUTH_BASE_URL!).origin })`.
- returns `payload.sub`.

`db.ts` creates one `pg.Pool` at module scope with `max: 5`, calls `attachDatabasePool(pool)`.

`cors.ts` reads `CORS_ORIGINS`, returns exact origin headers, handles `OPTIONS` with 204.

- [ ] **Step 4: Implement Hono app**

`app.use('*', corsMiddleware)`. `app.onError` maps `ApiError`, `ZodError`, and unknown errors. `GET /api/health` returns `{ ok: true }`. `GET /api/me` requires auth, looks up `app_users` by `auth_user_id`, returns `{ user, isOwner, aiEligible, aiReason }`. `aiEligible` is `false` until Task 5 fills the GitHub check; return `aiReason: 'github_check_unavailable'`.

- [ ] **Step 5: Add TypeScript and lint coverage**

`tsconfig.functions.json` extends Node settings, includes `functions/**/*.ts`, `src/lib/chat/**/*.ts`, and `src/data/{profile,projects,about,site}.ts`. Add it to root references. Add `functions/**/*.ts` to Biome includes. Add a Biome override for `functions/**/*.ts` disabling `style.noRestrictedImports`, because the function bundler does not resolve the `@/` alias and must use relative `../src/...` imports.

- [ ] **Step 6: Run checks**

Run: `pnpm typecheck && pnpm test functions/__tests__/auth.test.ts functions/__tests__/errors.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add functions package.json pnpm-lock.yaml biome.json tsconfig.functions.json tsconfig.json
git commit -m "feat(chat): add function bootstrap and auth"
```

---

### Task 5: GitHub account-age eligibility

**Files:**
- Create: `functions/chat/github.ts`
- Create: `functions/chat/users.ts`
- Test: `functions/__tests__/github.test.ts`
- Modify: `functions/api.ts` (`/api/me`)

**Interfaces:**
- Produces `isAiEligible(createdAt: Date, now?: Date): boolean`.
- Produces `fetchGitHubProfile(githubId: string): Promise<{ login: string; createdAt: Date }>`.
- Produces `resolveAppUser(pool, authUserId): Promise<AppUserResolution>` with `{ user, aiEligible, aiReason }`.
- Produces `OWNER_GITHUB_ID` comparison.

- [ ] **Step 1: Write failing tests**

Test:
- account created 366 days ago → eligible.
- account created 364 days ago → not eligible, reason `account_too_new`.
- exactly 365 days → eligible.
- GitHub 404 → not eligible, reason `github_profile_unavailable`.
- cached profile younger than 7 days → no network call.
- cached profile older than 7 days → one network call and update.
- `github_id === '71755844'` → `isOwner: true`, regardless of age.

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm test functions/__tests__/github.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement GitHub fetch**

`fetchGitHubProfile` calls `https://api.github.com/user/${githubId}` with `Accept: application/vnd.github+json`, `User-Agent: portfolio-chat`, and `cache: 'no-store'`. Throw `ApiError('UPSTREAM_ERROR', 502, true)` on non-OK. Parse `login` and `created_at`.

- [ ] **Step 4: Implement resolution and cache**

`resolveAppUser`:
- select `app_users` by `auth_user_id`.
- select `neon_auth.account` where `user_id = authUserId` and `provider_id = 'github'`; use `account_id` as `github_id`.
- If no row, upsert `app_users` from `github_id` and `isOwner`; fetch profile.
- Cache refresh when `github_checked_at` older than 7 days.
- On fetch failure, use cached values if present; otherwise return `aiReason: 'github_check_unavailable'` and still allow owner messages.
- `role` = `owner` only when `github_id === OWNER_GITHUB_ID`; everyone else `user`.

- [ ] **Step 5: Wire `/api/me`**

Return `{ user: { id, githubLogin, githubCreatedAt, role }, isOwner, aiEligible, aiReason }`.

- [ ] **Step 6: Run tests and typecheck**

Run: `pnpm test functions/__tests__/github.test.ts && pnpm typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add functions/chat/github.ts functions/chat/users.ts functions/api.ts functions/__tests__
git commit -m "feat(chat): verify github account age server-side"
```

---

### Task 6: Conversations, owner messages, pagination, edit, read

**Files:**
- Create: `functions/chat/conversations.ts`
- Create: `functions/chat/pagination.ts`
- Test: `functions/__tests__/conversations.test.ts`
- Test: `functions/__tests__/pagination.test.ts`
- Modify: `functions/api.ts`

**Interfaces:**
- Produces `getOrCreateConversation(client, userId, kind): Promise<{ id: string }>`.
- Produces `listMessages(client, conversationId, { beforeSeq, limit }): Promise<{ messages: ChatMessageDTO[]; hasMore: boolean; nextCursor: number | null }>`.
- Produces `createMessage(client, input): Promise<ChatMessageDTO>`.
- Produces `editMessage(client, { messageId, userId, body, now }): Promise<ChatMessageDTO>`.
- Produces `markRead(client, conversationId, side: 'user' | 'owner'): Promise<void>`.
- Produces routes:
  - `POST /api/chat/owner`
  - `POST /api/chat/owner/retry`
  - `GET /api/conversations/:kind/messages`
  - `PATCH /api/messages/:id`
  - `POST /api/conversations/:id/read`

- [ ] **Step 1: Write failing pagination tests**

Test with 25 messages:
- first page returns seq 25→16 ascending, `hasMore: true`, `nextCursor: 16`.
- second page `before=16` returns 15→6.
- third page returns 5→1, `hasMore: false`.
- deleted/superseded messages are excluded.
- invalid `kind` → `VALIDATION`.

- [ ] **Step 2: Write failing conversation tests**

Test:
- sending as user creates one `owner` conversation and one `user` message.
- same `clientId` twice returns the same message, no duplicate.
- different user cannot edit another user's message.
- editing writes a `message_revisions` row and sets `edited_at`.
- editing an owner reply as a visitor is rejected.
- `markRead` updates the correct side timestamp.
- owner reply updates `last_message_at` and user unread.

- [ ] **Step 3: Implement pagination and conversation helpers**

Use transactions for send/edit. `clientId` uniqueness is enforced by the DB index. On unique violation, select and return the existing message. Use `seq` for ordering. Return `sentAt` as ISO.

- [ ] **Step 4: Implement routes**

`POST /api/chat/owner`: require auth, normalize body, check owner quota (Task 7), create message, return `{ message }`.
`POST /api/chat/owner/retry`: same idempotency; return existing or create.
`GET /api/conversations/:kind/messages`: owner kind only for non-owner; assistant kind only own.
`PATCH /api/messages/:id`: author-only, owner-thread only in this task; AI edit route comes in Task 8.
`POST /api/conversations/:id/read`: caller must belong to the conversation.

- [ ] **Step 5: Run tests**

Run: `pnpm test functions/__tests__/pagination.test.ts functions/__tests__/conversations.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add functions/chat/conversations.ts functions/chat/pagination.ts functions/api.ts functions/__tests__
git commit -m "feat(chat): add owner thread messages and pagination"
```

---

### Task 7: Rate limiting and global OpenRouter guard

**Files:**
- Create: `functions/chat/rate-limit.ts`
- Test: `functions/__tests__/rate-limit.test.ts`
- Modify: `functions/api.ts`
- Modify: `functions/chat/conversations.ts`

**Interfaces:**
- Produces `consumeUserRateLimit(client, { userId, action, perMinute, perDay, now }): Promise<RateLimitResult>`.
- Produces `consumeGlobalAiLimit(client, now): Promise<RateLimitResult>`.
- Produces `pruneRateLimits(client, now): Promise<void>`.
- `RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number; reason: 'minute' | 'day' }`.

- [ ] **Step 1: Write failing tests**

Test:
- 10 owner sends in a minute allowed; 11th denied with reason `minute`.
- 60 owner sends in a day allowed; 61st denied with reason `day`.
- AI edit and retry call the AI quota action.
- 20 global AI requests in a minute allowed; 21st denied.
- 1,000 global AI requests in a day allowed; 1,001st denied.
- rows older than 48 hours are pruned.

- [ ] **Step 2: Implement**

`consumeUserRateLimit` runs in a transaction, takes `pg_advisory_xact_lock(hashtext(userId))`, inserts a `rate_limit_events` row, counts per minute/day, and returns the decision.

`consumeGlobalAiLimit` takes `pg_advisory_xact_lock(hashtext('openrouter-global'))`, upserts the current minute and UTC day buckets, and returns the decision.

Use `now` injection for tests. The global day key is `date_trunc('day', now at time zone 'utc')`.

- [ ] **Step 3: Wire to routes**

Owner send/retry uses `owner_send`. AI send/retry/edit uses `assistant_send`. `PATCH` owner edit uses `edit`. AI routes call `consumeGlobalAiLimit` before upstream.

- [ ] **Step 4: Return correct 429**

Include `Retry-After` header and `{ error: { code: 'RATE_LIMITED', message, retryable: true } }`.

- [ ] **Step 5: Run tests and typecheck**

Run: `pnpm test functions/__tests__/rate-limit.test.ts && pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add functions/chat/rate-limit.ts functions/chat/conversations.ts functions/api.ts functions/__tests__
git commit -m "feat(chat): add per-user and global rate limits"
```

---

### Task 8: AI prompt, OpenRouter streaming, persistence, edit fork, retry

**Files:**
- Create: `functions/chat/prompt.ts`
- Create: `functions/chat/openrouter.ts`
- Create: `functions/chat/ai.ts`
- Test: `functions/__tests__/prompt.test.ts`
- Test: `functions/__tests__/ai.test.ts`
- Modify: `functions/api.ts`
- Modify: `functions/chat/conversations.ts`

**Interfaces:**
- Produces `buildSystemPrompt(): string`.
- Produces `buildAiContext(messages: ChatMessageDTO[]): Array<{ role: 'user' | 'assistant'; content: string }>`.
- Produces `streamAssistantReply(input): AsyncIterable<{ text: string; outputTokens?: number }>`.
- Produces `POST /api/chat/assistant`, `POST /api/chat/assistant/edit`, `POST /api/chat/assistant/retry`.

- [ ] **Step 1: Write failing prompt tests**

Test:
- prompt includes name, role, location, availability, all six project titles, stack groups, and contact links.
- context includes only last 20 complete non-deleted messages.
- context is capped at 12,000 characters, dropping oldest first.
- failed/streaming/superseded messages excluded.
- current user message always included.

- [ ] **Step 2: Write failing AI tests**

Mock OpenRouter:
- normal stream yields deltas and persists final assistant message `status = 'complete'`.
- upstream 429 yields `UPSTREAM_ERROR` and persists `status = 'failed'`.
- abort mid-stream persists partial body as `failed`, not `streaming`.
- edit of an earlier user message soft-deletes later messages and creates a new assistant message.
- edit of a message in another user's conversation → 404.
- retry marks the failed assistant message `superseded` and creates a new one.
- output over 6,000 chars is truncated and marked `truncated`.

- [ ] **Step 3: Implement prompt**

Import `profile`, `projects`, `principles`, and `siteFacts` from `src/data`. Render a compact, deterministic prompt. No secrets, no HTML.

- [ ] **Step 4: Implement OpenRouter**

Use `openai` SDK:
```ts
new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY!,
  defaultHeaders: {
    'HTTP-Referer': 'https://gopendra.is-a.dev',
    'X-OpenRouter-Title': 'Gopendranath Portfolio Chat',
  },
})
```
Call `chat.completions.create({ model: 'openrouter/free', messages, stream: true, max_tokens: 1200, stream_options: { include_usage: true } })`. Yield `delta.content`; capture usage.

- [ ] **Step 5: Implement SSE route**

`POST /api/chat/assistant`:
- require auth, AI eligibility, normalize body, quota checks.
- transaction: create user message and assistant placeholder (`status='streaming'`).
- if `(conversation_id, client_id)` already exists, return `409 DUPLICATE` with the existing `{ userMessageId, assistantMessageId }`; the client refreshes instead of duplicating.
- `streamSSE` send `meta`, then deltas, then `done`.
- on completion update assistant body/status/tokens; on error update failed/error fields.
- `request.signal` abort handling.
- 6,000-char cap.
- heartbeat comment every 15 seconds.

`POST /api/chat/assistant/edit`:
- require auth, ownership, AI eligibility, quota.
- transaction: write revision, update body, soft-delete all later messages (`status='superseded'`, `deleted_at=now`), create new assistant placeholder.
- stream.

`POST /api/chat/assistant/retry`:
- require auth, ownership, AI eligibility, quota.
- find failed assistant message; mark `superseded`; create new assistant placeholder; stream using preceding user message.

- [ ] **Step 6: Run tests**

Run: `pnpm test functions/__tests__/prompt.test.ts functions/__tests__/ai.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add functions/chat/prompt.ts functions/chat/openrouter.ts functions/chat/ai.ts functions/chat/conversations.ts functions/api.ts functions/__tests__
git commit -m "feat(chat): stream assistant replies and fork edits"
```

---

### Task 9: Owner inbox API

**Files:**
- Create: `functions/chat/inbox.ts`
- Test: `functions/__tests__/inbox.test.ts`
- Modify: `functions/api.ts`

**Interfaces:**
- Produces `GET /api/owner/threads`
- Produces `GET /api/owner/threads/:userId/messages`
- Produces `POST /api/owner/threads/:userId/messages`
- Produces `POST /api/owner/threads/:userId/read`
- Produces `listOwnerThreads(client, { before, limit, ownerId }): Promise<{ threads, hasMore, nextCursor }>`.

- [ ] **Step 1: Write failing tests**

Test:
- non-owner gets 403 on every owner route.
- owner sees only `kind='owner'` conversations, never `assistant`.
- threads sorted by `last_message_at desc`.
- unread count counted from `owner_last_read_at`.
- owner reply creates `author='owner'`, updates `last_message_at`, sets user unread.
- owner cannot read another conversation kind.
- pagination uses `last_message_at` + id cursor.

- [ ] **Step 2: Implement queries and routes**

Use `app_users.role = 'owner'` derived from `github_id`. The `userId` path parameter refers to the visitor's `app_users.id`, not the auth user id. Verify the conversation exists and is `kind='owner'`.

- [ ] **Step 3: Run tests**

Run: `pnpm test functions/__tests__/inbox.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add functions/chat/inbox.ts functions/api.ts functions/__tests__
git commit -m "feat(chat): add owner inbox api"
```

---

### Task 10: Deploy function and smoke-test API

**Files:**
- Create: `scripts/smoke-chat.mjs`
- Modify: `.env.local` (function URL)
- Modify: `.env.example`

**Interfaces:**
- Produces deployed `api` function URL in `VITE_CHAT_API_URL`.
- Produces smoke checks for health, auth rejection, and SSE meta.

- [ ] **Step 1: Link and deploy**

```bash
npx neon link
npx neon deploy --env .env.local
npx neon functions get api
```
Expected: `current_deployment.status = completed`. Copy the invocation URL to `.env.local` as `VITE_CHAT_API_URL`.

- [ ] **Step 2: Write smoke script**

`scripts/smoke-chat.mjs`:
- `GET /api/health` → 200 `{ ok: true }`.
- `GET /api/me` without token → 401 `UNAUTHORIZED`.
- `OPTIONS /api/chat/owner` with allowed origin → 204 and matching `Access-Control-Allow-Origin`.
- `POST /api/chat/owner` without token → 401, no DB row.

- [ ] **Step 3: Run smoke**

Run: `node --env-file=.env.local scripts/smoke-chat.mjs`
Expected: all checks pass.

- [ ] **Step 4: Commit**

```bash
git add scripts/smoke-chat.mjs .env.example
git commit -m "test(chat): add deployed api smoke checks"
```

---

### Task 11: Frontend auth client, session, and signed-out gate

**Files:**
- Create: `src/lib/chat/auth-client.ts`
- Create: `src/lib/chat/session.ts`
- Create: `src/components/chat/auth-panel.tsx`
- Create: `src/components/chat/ai-locked-panel.tsx`
- Modify: `src/components/chat/chat-shell.tsx`
- Modify: `src/routes/chat.tsx` if a provider wrapper is needed
- Test: `src/components/chat/__tests__/chat-auth.test.tsx`

**Interfaces:**
- Produces `authClient` from `@neon/auth`.
- Produces `useChatSession()` → `{ session, user, token, isOwner, aiEligible, aiReason, isLoading, signIn, signOut }`.
- Produces `AuthPanel` and `AiLockedPanel`.

- [ ] **Step 1: Write failing tests**

Mock `authClient`:
- signed out → GitHub sign-in button visible; composer absent.
- signed in → composer visible.
- `aiEligible=false` → assistant thread shows locked panel, composer disabled.
- owner → owner tab available.
- loading → skeleton, no sign-in flash.

- [ ] **Step 2: Implement auth client**

```ts
import { createAuthClient } from '@neon/auth'
import { BetterAuthReactAdapter } from '@neon/auth/react/adapters'

export const authClient = createAuthClient(
  import.meta.env.VITE_NEON_AUTH_URL,
  {
    adapter: BetterAuthReactAdapter({
      fetchOptions: { credentials: 'include' },
    }),
  },
)
```

- [ ] **Step 3: Implement session hook**

Use TanStack Query key `['chat','session']`; `queryFn` calls `authClient.getSession()`, returns `{ session, user }`. Call `GET /api/me` when a session exists. `token = session.token`. Normalize `sentAt`.

`signIn` calls `authClient.signIn.social({ provider: 'github', callbackURL: window.location.origin + '/chat' })`. `signOut` calls `authClient.signOut()` and clears the query cache.

- [ ] **Step 4: Add panels**

`AuthPanel`: concise heading, GitHub button, no email/password. `AiLockedPanel`: explains 1-year requirement, shows owner-thread link.

- [ ] **Step 5: Wire `ChatShell`**

If loading, render skeleton. If signed out, render profile list and `AuthPanel` in the thread area. If signed in, render threads. Keep existing CSS.

- [ ] **Step 6: Run tests**

Run: `pnpm test src/components/chat/__tests__/chat-auth.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/chat src/components/chat src/routes/chat.tsx
git commit -m "feat(chat): add github auth session gate"
```

---

### Task 12: Frontend API client, query keys, history pagination

**Files:**
- Create: `src/lib/chat/api-client.ts`
- Create: `src/lib/chat/queries.ts`
- Create: `src/lib/chat/stream.ts`
- Modify: `src/components/chat/message-list.tsx`
- Modify: `src/components/chat/message-bubble.tsx`
- Test: `src/lib/chat/__tests__/stream.test.ts`
- Test: `src/components/chat/__tests__/chat-history.test.tsx`

**Interfaces:**
- Produces `chatFetch<T>(path, init, token): Promise<T>`.
- Produces `streamChat(path, body, token, handlers, signal): Promise<void>`.
- Produces query hooks `useMessages(kind, options?: { userId?: string })`, `useOwnerThreads()`, `useSendOwnerMessage()`, `useEditMessage()`, `useRetryOwnerMessage()`.
- `userId` is required for the owner inbox and omitted for the visitor's own threads. The query key includes it.
- Produces `MessageList` props `{ messages, profile, hasMore, isLoadingMore, onLoadMore, onEditMessage, onRetryMessage }`.

- [ ] **Step 1: Write failing stream parser tests**

Feed a `ReadableStream` with `meta`, two `delta`, `done`, and an error frame. Assert handlers receive parsed objects and malformed frames are ignored. Test abort signal.

- [ ] **Step 2: Write failing history tests**

- initial 10 render, scroll at bottom.
- click “Load previous messages” prepends 10 and preserves `scrollTop`.
- loading skeleton replaces button while fetching.
- failed message shows Retry.
- edit timestamp renders `edited HH:MM`.

- [ ] **Step 3: Implement `api-client`**

`chatFetch` gets fresh token from `authClient.getSession()` per request, sends `Authorization`, retries once on 401 after refreshing. Base URL from `VITE_CHAT_API_URL`.

`streamChat` uses `fetch` POST, reads `response.body` with `TextDecoderStream`, parses `event:`/`data:` blocks, dispatches handlers, and calls `onError` for non-OK JSON.

- [ ] **Step 4: Implement queries**

TanStack Query keys:
- `['chat','messages',kind]`
- `['chat','owner-threads']`
- `['chat','owner-thread',userId]`

`useMessages` uses `useInfiniteQuery`, `getNextPageParam: (last) => last.nextCursor`, and `select` to flatten old→new.

- [ ] **Step 5: Update message list**

Replace the single scroll-to-bottom effect with:
- scroll to bottom on initial load and new messages.
- preserve `scrollTop` when older messages are prepended.
- show “Load previous messages” at the top when `hasMore`.
- show retry action on `status='failed'`.

- [ ] **Step 6: Run tests**

Run: `pnpm test src/lib/chat/__tests__/stream.test.ts src/components/chat/__tests__/chat-history.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/chat src/components/chat
git commit -m "feat(chat): load paginated history and parse streams"
```

---

### Task 13: Composer limits, loading, send, retry, and optimistic messages

**Files:**
- Modify: `src/components/chat/chat-composer.tsx`
- Modify: `src/components/chat/chat-shell.tsx`
- Modify: `src/components/chat/message-bubble.tsx`
- Test: `src/components/chat/__tests__/chat-composer.test.tsx`

**Interfaces:**
- `ChatComposer` props add `maxLength`, `isSending`, `disabledReason`.
- `ChatShell` send uses `useSendOwnerMessage` or `streamChat` based on active view.
- Optimistic message shape: `{ id: 'pending-<clientId>', clientId, author: 'user', body, sentAt: Date.now(), status: 'sending' }`.

- [ ] **Step 1: Write failing tests**

- 2,000 chars allowed; 2,001 blocked.
- counter appears at 1,800+.
- sending disables composer and shows loading.
- failed send keeps the message with Retry.
- retry with same `clientId` does not duplicate.
- Enter sends, Shift+Enter newline, IME composition ignored.

- [ ] **Step 2: Implement composer**

Add `maxLength={MAX_MESSAGE_LENGTH}`, `aria-describedby` counter, `isSending` disable, and error text. Keep existing auto-height.

- [ ] **Step 3: Implement send flow**

Owner:
- generate `clientId` with `crypto.randomUUID()`.
- append optimistic message.
- call `useSendOwnerMessage`.
- replace optimistic id with server message; on error mark `failed` and keep `clientId`.

Assistant:
- append optimistic user message.
- call `streamChat('/api/chat/assistant', { body, clientId }, token, ...)`.
- on `meta`, replace optimistic id with server ids and add assistant placeholder.
- append deltas.
- on `done`, mark complete.
- on error, mark failed and show retry.

- [ ] **Step 4: Run tests**

Run: `pnpm test src/components/chat/__tests__/chat-composer.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/chat
git commit -m "feat(chat): add limits loading and retry"
```

---

### Task 14: AI stream UI, stop, retry, and edit fork

**Files:**
- Create: `src/components/chat/streaming-message.tsx`
- Modify: `src/components/chat/chat-shell.tsx`
- Modify: `src/components/chat/message-bubble.tsx`
- Modify: `src/components/chat/message-actions.tsx`
- Modify: `src/components/chat/use-message-editing.ts`
- Test: `src/components/chat/__tests__/chat-ai-stream.test.tsx`

**Interfaces:**
- Produces `StreamingMessage` with typing dots, delta text, blinking cursor, Stop button.
- Produces AI edit confirmation flow.
- `MessageActions` adds `canRetry`, `onRetry`.

- [ ] **Step 1: Write failing tests**

- before first delta → typing indicator.
- deltas append.
- Stop aborts and shows failed + Retry.
- failed assistant reply → Retry calls `/assistant/retry`.
- editing an old user message shows confirmation.
- confirming removes later messages and streams a new reply.
- assistant messages have no Edit button.
- owner thread edit has no fork confirmation.

- [ ] **Step 2: Implement streaming message**

Use `aria-live="polite"`, a text bubble, and a blinking block cursor. Respect `prefers-reduced-motion`. Stop button calls `AbortController.abort()`.

- [ ] **Step 3: Implement AI edit fork**

`useMessageEditing` gains `onBeforeSave?: () => Promise<boolean>`. For assistant thread edits with later messages, open a confirmation dialog. On confirm, call `/assistant/edit` and stream. Remove later messages optimistically.

- [ ] **Step 4: Implement retry**

Assistant failed message shows Retry. Owner failed message shows Retry. Retry passes the original `clientId` or assistant message id.

- [ ] **Step 5: Run tests**

Run: `pnpm test src/components/chat/__tests__/chat-ai-stream.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/chat
git commit -m "feat(chat): stream ai replies with stop retry and fork edits"
```

---

### Task 15: Owner inbox UI

**Files:**
- Create: `src/components/chat/owner-inbox.tsx`
- Create: `src/components/chat/owner-thread-list.tsx`
- Modify: `src/components/chat/chat-shell.tsx`
- Modify: `src/components/chat/profile-list.tsx`
- Test: `src/components/chat/__tests__/chat-owner-inbox.test.tsx`

**Interfaces:**
- Produces `OwnerInbox` with thread list, selected thread, back control, reply composer.
- Produces owner-only `inbox` view in `ChatShell`.
- Produces unread badges.

- [ ] **Step 1: Write failing tests**

- non-owner never sees Inbox.
- owner sees Inbox and owner threads.
- assistant conversations never appear.
- unread badge from API.
- clicking a thread opens messages; back returns to list.
- owner reply appears as `author='owner'`.
- opening a thread clears unread.
- polling refetches every 10 seconds while visible.

- [ ] **Step 2: Implement owner inbox**

Add `activeView: 'assistant' | 'owner' | 'inbox'`. `inbox` is only in the profile list for owners. `OwnerInbox` uses `useOwnerThreads()` and `useMessages` for the selected visitor. Mobile: thread list replaces thread content, with a back button.

- [ ] **Step 3: Unread and polling**

Use `refetchInterval: 10_000` for `owner-threads` and the active owner thread. Mark read on open. Show unread counts in the profile list and thread list.

- [ ] **Step 4: Run tests**

Run: `pnpm test src/components/chat/__tests__/chat-owner-inbox.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/chat
git commit -m "feat(chat): add two-way owner inbox"
```

---

### Task 16: Copy, metadata, README, and accessibility pass

**Files:**
- Modify: `src/data/pages.ts`
- Modify: `src/components/chat/chat-shell.tsx`
- Modify: `src/components/chat/chat-composer.tsx`
- Modify: `README.md`
- Modify: `src/components/chat/__tests__/chat-shell.test.tsx`

**Interfaces:**
- Removes “preview” copy and “messages stay on the page”.
- Updates WebMCP `tooldescription` to reflect the real backend.
- Documents environment, deployment, key rotation, and owner inbox.

- [ ] **Step 1: Update copy**

`pageMeta.chat.description` becomes a real chat description. Composer `tooldescription` says messages are sent to Gopendranath or the portfolio assistant. Hide the WebMCP tool when signed out.

- [ ] **Step 2: Update README**

Add:
- `/chat` real backend.
- Neon Auth + Functions + Postgres setup.
- `.env.local` variable list.
- migration command.
- function deploy command.
- OpenRouter 30-day key rotation.
- owner inbox behavior.
- AI age gate and limits.

- [ ] **Step 3: Accessibility pass**

Verify:
- sign-in button focus.
- locked panel heading.
- streaming log announcements.
- Stop/Retry labels.
- owner inbox back button.
- 320px layout.

- [ ] **Step 4: Update existing tests**

Replace preview-only assertions. Mock session and API. Keep the existing edit timestamp and IME tests.

- [ ] **Step 5: Run checks**

Run: `pnpm check && pnpm typecheck && pnpm test && pnpm build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add README.md src
git commit -m "docs(chat): document live chat and update copy"
```

---

### Task 17: Production deploy and end-to-end verification

**Files:**
- Modify: `.env.local` (Vercel production URL)
- No tracked secrets.

**Interfaces:**
- Produces a working production chat at `https://gopendra.is-a.dev/chat`.

- [ ] **Step 1: Add Vercel env vars**

Set `VITE_NEON_AUTH_URL` and `VITE_CHAT_API_URL` in the Vercel project for Production and Preview. Rebuild.

- [ ] **Step 2: Verify CORS and auth**

In a clean browser:
- sign in with GitHub.
- `/api/me` returns the GitHub login and `aiEligible: true` for the owner.
- a second GitHub account under 365 days sees the AI locked panel.
- owner sees Inbox; visitor does not.

- [ ] **Step 3: Verify owner two-way flow**

Visitor sends a message; owner inbox shows unread; owner replies; visitor sees the reply within 10 seconds; unread clears on both sides.

- [ ] **Step 4: Verify AI flow**

Send a prompt; first token arrives; stop mid-stream; retry succeeds; edit an old prompt; later messages disappear; new answer streams.

- [ ] **Step 5: Verify limits**

- 2,001-character input blocked client and server.
- 1,201-token output stops/truncates.
- 6th AI send in a minute returns 429.
- duplicate `clientId` creates one row.
- direct API call without token returns 401.
- direct API call with under-age token returns 403.

- [ ] **Step 6: Verify history**

Refresh `/chat`; newest 10 load. Click “Load previous messages”; next 10 prepend without scroll jump.

- [ ] **Step 7: Final checks**

Run: `pnpm check && pnpm typecheck && pnpm test && pnpm build`
Expected: PASS.

- [ ] **Step 8: Commit any final fixes**

```bash
git add -A
git commit -m "chore(chat): finalize production chat"
```

---

## Execution Notes

- Use `neon dev` for the function and `pnpm dev` for the SPA. Point `VITE_CHAT_API_URL` at the local function URL.
- The function must be deployed before the SPA can use the production URL.
- OpenRouter key rotation is mandatory every 30 days.
- If Neon Auth does not expose `session.token` in the installed version, use `authClient.getJWTToken(false)`; the type includes both `session.token` and `getJWTToken`.
- If `neon_auth.account.account_id` is not the numeric GitHub id in the deployed schema, read the actual column name first; do not guess.
- If GitHub's unauthenticated limit is hit, use the cached age; never trust the client.
- If Telegram/email or realtime is requested later, add it as a separate design.
