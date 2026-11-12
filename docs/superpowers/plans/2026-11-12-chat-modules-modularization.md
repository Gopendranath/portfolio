# Chat Modules Modularization (Audit) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the two mixed Modules in `functions/chat/` — `ai.ts` (459 lines: turn setup + streaming + persistence) and `conversations.ts` (359 lines: message CRUD + conversation lifecycle) — into four deep Modules with no behavior change. All other `chat/` Modules stay as-is (audit verdict below).

**Architecture:** Two pure move-only splits following existing flat-file convention (no subfolders, no barrels). `ai.ts` → `ai-turns.ts` (turn lifecycle) + `ai-stream.ts` (streaming execution). `conversations.ts` → `messages.ts` (message rows) + `conversations.ts` (conversation lifecycle). Rewire the six consumers (two route files, `http/sse.ts`, `chat/inbox.ts`, two `chat/` internals) and four test files' imports. `functions/api.ts` (31-line composition root) is untouched.

**Tech Stack:** TypeScript, `pg` Pool, Vitest 5.1.0, Biome 2.6.6, pnpm.

**Spec:** Current behavior of `functions/chat/ai.ts`, `functions/chat/conversations.ts`, and all their consumers (routes + `http/sse.ts` + `chat/inbox.ts`), verified by `pnpm typecheck`, `pnpm test` (45 files / 292 tests), `pnpm lint`.

## Audit verdict (why only these two)

- `ai.ts` mixes two Seams: turn lifecycle (`begin*` + `AssistantTurn`, driven by user actions and DB state) and streaming execution (`runAssistantTurn` + `finishMessage`, driven by the gateway). The streaming Interface (`runAssistantTurn({...}) → AssistantTurnResult`) is independently deep and testable with a fake gateway — it earns its Module. Deletion test: removing streaming reappears across `sse.ts` and every future caller.
- `conversations.ts` mixes two tables' concerns: `messages` rows (CRUD + DTO mapping) and `conversations` rows (lifecycle + read receipts). The two halves share zero code (message functions touch the conversations table only via SQL, no imports). Deletion test passes both ways.
- `history.ts` (259), `inbox.ts` (183), `rate-limit.ts` (173), `users.ts` (157), `github.ts` (132), `prompt.ts` (106): each owns one table or one pure concern behind a small Interface. Splitting any of them (e.g. cursor codec out of `history.ts`) produces shallow Modules whose Interface is as complex as the extracted code. Leave them.
- `auth/cors/db/errors/openrouter/validation.ts`: already minimal. Leave them.

## Global Constraints

- Move-only. No signature changes, no SQL changes, no new dependencies, no behavior change.
- Flat files under `functions/chat/`. No subfolders, no barrel (`index.ts`) files — consumers import exact Modules.
- `AssistantTurn` stays defined in `ai-turns.ts`; `AssistantTurnResult` stays in `ai-stream.ts` (each lives with its producer).
- `MessageRow`, `MESSAGE_COLUMNS`, `toMessageDTO`, `CreateMessageInput` move to `messages.ts` (they describe message rows).
- Test files stay in place; only their import paths change. No test logic edits.
- `pnpm typecheck`, `pnpm test`, `pnpm lint` green after every task. One commit per task. Work on a new branch off `main` (e.g. `refactor/chat-modules`).

## Review Focus

- `ai-turns.ts` keeps `loadContext` private (only the three `begin*` functions use it) — it must not leak into `ai-stream.ts`.
- `finishMessage` moves to `ai-stream.ts` (only `runAssistantTurn` calls it) — no duplicate persistence helpers left in `ai-turns.ts`.
- `messages.ts` ↔ `conversations.ts` must have zero imports between them; any new cross-import is a failed split.
- `http/sse.ts` ends up importing `AssistantTurn` from `../chat/ai-turns` and `markAssistantFailed, runAssistantTurn` from `../chat/ai-stream` — the old `../chat/ai` path must have zero remaining importers.
- `inbox.ts` splits its single `./conversations` import into `./messages` (`createMessage`, `listMessages`) + `./conversations` (`getConversationForUser`, `markRead`, `markUnread`).

---

### Task 1: Split `messages.ts` out of `conversations.ts`

**Files:**
- Create: `functions/chat/messages.ts`
- Modify: `functions/chat/conversations.ts` (remove moved code)
- Modify imports in: `functions/chat/ai.ts`, `functions/chat/inbox.ts`, `functions/routes/owner-chat.ts`, `functions/routes/conversations.ts`, `functions/__tests__/ai.test.ts`, `functions/__tests__/conversations.test.ts`, `functions/__tests__/history.test.ts`, `functions/__tests__/inbox.test.ts`
- Test: existing suites as regression gate

**Interfaces:**
- Consumes: `Pool` from `pg`, `ChatAuthor/ChatMessageDTO/PAGE_SIZE` from `../../src/lib/chat/protocol`, `ApiError` from `./errors`.
- Produces (`messages.ts`): `MessageRow`, `MESSAGE_COLUMNS`, `toMessageDTO(row: MessageRow): ChatMessageDTO`, `CreateMessageInput`, `createMessage(pool, input): Promise<ChatMessageDTO>`, `listMessages(pool, conversationId, options): Promise<{messages, hasMore, nextCursor}>`, `editMessage(pool, input): Promise<ChatMessageDTO>`.
- Keeps (`conversations.ts`): `getOrCreateConversation(pool, userId, kind)`, `getConversationForUser(pool, userId, kind)`, `markRead(pool, conversationId, side, now?)`, `markUnread(pool, conversationId, side)`.

- [ ] **Step 1: Create `functions/chat/messages.ts`**

Move verbatim from `conversations.ts`: `MessageRow`, `MESSAGE_COLUMNS`, `toMessageDTO`, `CreateMessageInput`, `createMessage`, `listMessages`, `editMessage`, plus their imports (`Pool`, protocol types, `ApiError`). No logic edits.

- [ ] **Step 2: Trim `functions/chat/conversations.ts`**

Delete the moved blocks. It keeps `getOrCreateConversation`, `getConversationForUser`, `markRead`, `markUnread` and only the imports they use. It must not import from `./messages`.

- [ ] **Step 3: Rewire consumers**

`chat/ai.ts`: `createMessage, MESSAGE_COLUMNS, type MessageRow, toMessageDTO` ← `./messages`. `chat/inbox.ts`: `createMessage, listMessages` ← `./messages`; `getConversationForUser, markRead, markUnread` stay ← `./conversations`. `routes/owner-chat.ts`: `createMessage` ← `messages`, `getOrCreateConversation` ← `conversations`. `routes/conversations.ts`: `editMessage, listMessages, getOrCreateConversation` split accordingly (`editMessage/listMessages` ← messages). Test files: same split for their import blocks.

- [ ] **Step 4: Verify no stale imports**

Run: `Select-String -Pattern "chat/conversations" -Path functions/chat/ai.ts, functions/chat/inbox.ts`
Expected: `ai.ts` has no match; `inbox.ts` matches only the lifecycle names.

Run: `pnpm typecheck`
Expected: PASS.

Run: `pnpm test`
Expected: PASS (45 files / 292 tests).

- [ ] **Step 5: Commit**

```bash
git add functions/chat/messages.ts functions/chat/conversations.ts functions/chat/ai.ts functions/chat/inbox.ts functions/routes/owner-chat.ts functions/routes/conversations.ts functions/__tests__/
git commit -m "refactor: split messages module out of conversations"
```

---

### Task 2: Split `ai.ts` into `ai-turns.ts` + `ai-stream.ts`

**Files:**
- Create: `functions/chat/ai-turns.ts`
- Create: `functions/chat/ai-stream.ts`
- Delete: `functions/chat/ai.ts`
- Modify imports in: `functions/http/sse.ts`, `functions/routes/assistant.ts`, `functions/__tests__/ai.test.ts`
- Test: existing suites as regression gate

**Interfaces:**
- `ai-turns.ts` consumes: `createMessage` from `./messages`, history fns from `./history`, `ApiError`, `OPENROUTER_MODEL` from `./openrouter`, `buildAiContext` usage via `loadContext` (stays private). Produces: `AssistantTurn`, `beginAssistantTurn(pool, {userId, body, clientId, conversationId?})`, `beginAssistantEdit(pool, {userId, messageId, body})`, `beginAssistantRetry(pool, {userId, assistantMessageId})`.
- `ai-stream.ts` consumes: `buildSystemPrompt, buildAiContext` from `./prompt`, `MAX_AI_OUTPUT_CHARS` + `ChatMessageDTO` from protocol, `OpenRouterGateway` type. Produces: `AssistantTurnResult`, `markAssistantFailed(pool, messageId, code?)`, `runAssistantTurn({pool, assistantMessageId, context, gateway, signal?, onDelta?})`.

- [ ] **Step 1: Create `functions/chat/ai-turns.ts`**

Move verbatim from `ai.ts`: `loadContext` (private, unchanged), `AssistantTurn`, `beginAssistantTurn`, `beginAssistantEdit`, `beginAssistantRetry`, plus only their imports (`createMessage` ← `./messages`, history fns, `ApiError`, `OPENROUTER_MODEL`, `ChatMessageDTO` type). No logic edits.

- [ ] **Step 2: Create `functions/chat/ai-stream.ts`**

Move verbatim from `ai.ts`: `AssistantTurnResult`, `finishMessage` (private), `markAssistantFailed`, `runAssistantTurn`, plus only their imports (`MAX_AI_OUTPUT_CHARS`, prompt builders, gateway type). No logic edits.

- [ ] **Step 3: Delete `functions/chat/ai.ts` and rewire consumers**

Delete the file. `http/sse.ts`: `markAssistantFailed, runAssistantTurn` ← `../chat/ai-stream`; `type AssistantTurn` ← `../chat/ai-turns`. `routes/assistant.ts`: `beginAssistantEdit, beginAssistantRetry, beginAssistantTurn` ← `../chat/ai-turns`. `__tests__/ai.test.ts`: `begin*` ← `ai-turns`, `runAssistantTurn` ← `ai-stream`.

- [ ] **Step 4: Verify zero remaining `chat/ai` importers and full gate**

Run: `Select-String -Pattern "chat/ai'" -Path functions -Recurse`
Expected: zero matches (only `ai-turns` / `ai-stream` matches exist).

Run: `pnpm typecheck && pnpm test`
Expected: PASS both (45 files / 292 tests).

Run: `pnpm lint`
Expected: PASS, no new violations.

- [ ] **Step 5: Commit**

```bash
git add functions/chat/ai-turns.ts functions/chat/ai-stream.ts functions/chat/ai.ts functions/http/sse.ts functions/routes/assistant.ts functions/__tests__/ai.test.ts
git commit -m "refactor: split ai module into turns and stream"
```

---

### Task 3: Final verification (module inventory)

**Files:**
- Modify: none (verification only; fix only unused imports if flagged)

**Interfaces:**
- Consumes: final `functions/chat/` + `functions/routes/` + `functions/http/`.
- Produces: clean `pnpm typecheck`, `pnpm test`, `pnpm lint`, and confirmation that every route path is still registered exactly once.

- [ ] **Step 1: Confirm the seam inventory**

Run: `Select-String -Pattern "'/api/" -Path functions/routes/*.ts | Measure-Object`
Expected: 19 registrations (17 unique paths).

Run: `Select-String -Pattern "from '\./(ai|conversations)'" -Path functions/chat/*.ts`
Expected: zero matches — nothing imports the old unsplit paths.

- [ ] **Step 2: Run the full gate**

Run: `pnpm typecheck`
Expected: PASS.

Run: `pnpm test`
Expected: PASS (45 files / 292 tests).

Run: `pnpm lint`
Expected: PASS.

---

## Self-Review

1. **Spec coverage:** every export of old `ai.ts`/`conversations.ts` has an owning Module (turns ×3 + `AssistantTurn` → Task 2A; stream ×2 + `AssistantTurnResult` + private `finishMessage` → Task 2B; message ×7 → Task 1A; lifecycle ×4 → Task 1B). Every consumer file is listed in a rewire step. Covered.
2. **Step scan:** each step names one file and one action with a checkable command. No placeholders.
3. **Type consistency:** `AssistantTurn` (turns), `AssistantTurnResult` (stream), `MessageRow/CreateMessageInput` (messages) match current definitions; consumer import lists name the exact symbols each file uses today.
4. **Review Focus:** the five riskiest silent moves (private `loadContext` placement, `finishMessage` placement, zero cross-imports between messages/conversations, `sse.ts` split imports, `inbox.ts` split imports) each have an explicit verification step.
5. **Proportion:** plan moves ~800 lines via signatures and import lists, no function bodies transcribed. Decisions (seam placement, symbol ownership) are all explicit.
