# Assistant Chat History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let signed-in visitors keep multiple AI chats, switch between them, start new ones, and delete old ones.

**Architecture:** Reuse the `conversations` table, relax its uniqueness to allow many assistant conversations, add titles, and keep one owner conversation per visitor. The client keeps a selection (`auto`, `new`, or a chat id), renders the latest chat by default, and lazily creates a conversation on the first message. History UI is a native dialog triggered from the assistant header on desktop and a floating button inside the chat on phones.

**Tech Stack:** React 19, TanStack Query 5, Hono, Neon Postgres, Zod 4, Vitest, Testing Library, Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-11-12-chat-history-design.md`

## Global Constraints

- Assistant history only; owner inbox behavior stays unchanged.
- One owner conversation per visitor remains enforced.
- History order: `last_message_at desc, id desc`.
- Title: first user message, whitespace-normalized, maximum 80 characters.
- Delete only assistant conversations owned by the caller; hard delete messages/revisions, never touch `ai_usage` or `rate_limit_events`.
- No empty conversations in history.
- Signed-in and AI-eligible gate for all assistant history endpoints.
- Input limit stays 2,000 characters; AI output stays 1,200 tokens / 6,000 chars.
- Keep `src/components/ui/target-cursor.tsx` unchanged.
- Tests use `TEST_DATABASE_URL` (`test-clean`), never production.

## Review Focus

- Typing and sending while the history list is still loading must create a new chat, not fail or attach to an arbitrary one. Covered in Task 6.
- Switching or deleting while a response streams must stop the stream before changing the active chat. Covered in Task 6.
- Deleting the active chat must not leave the thread pointed at a deleted conversation. Covered in Task 3 and Task 6.
- Legacy empty assistant conversations must not become history rows or consume the one-time title. Covered in Task 1.
- Sending into a chat deleted in another tab must keep the typed body and explain that nothing was sent. Covered in Task 4 and Task 6.

---

### Task 1: Schema and assistant-history data helpers

**Files:**
- Create: `db/migrations/004_assistant_chat_history.sql`
- Create: `functions/chat/history.ts`
- Create: `functions/__tests__/history.test.ts`
- Modify: `functions/chat/conversations.ts` (keep `getOrCreateConversation` for owner)
- Modify: `src/lib/chat/protocol.ts` (history DTOs and query schemas)

**Interfaces:**
- Produces:
  - `titleFromBody(body: string): string`
  - `createAssistantConversation(pool: Pool, userId: string): Promise<{ id: string }>`
  - `getOwnedAssistantConversation(pool: Pool, userId: string, conversationId: string): Promise<{ id: string }>`
  - `setAssistantTitleIfEmpty(pool: Pool, conversationId: string, body: string): Promise<void>`
  - `retitleAssistantConversation(pool: Pool, conversationId: string, messageSeq: number, body: string): Promise<void>`
  - `listAssistantConversations(pool: Pool, userId: string, options?: { limit?: number; before?: string }): Promise<AssistantConversationPage>`
  - `deleteAssistantConversation(pool: Pool, userId: string, conversationId: string): Promise<void>`
  - Types `AssistantConversationDTO`, `AssistantConversationPage`, `assistantHistoryQuerySchema`, `assistantSendSchema`, `assistantMessagesQuerySchema`.

- [ ] **Step 1: Write failing DB tests**

Create `functions/__tests__/history.test.ts` following the pool/user setup in `functions/__tests__/conversations.test.ts`. Tests:
1. creates multiple assistant conversations for one user;
2. rejects a second owner conversation;
3. lists only non-empty assistant chats, newest activity first;
4. `titleFromBody` collapses whitespace and truncates to 80 characters;
5. first user message sets title once; later messages do not overwrite;
6. retitle updates only when the edited message is the earliest visible user message;
7. foreign user cannot read or delete;
8. delete cascades messages and revisions but leaves ai usage/rate-limit rows.

- [ ] **Step 2: Apply migration to the test branch**

Run with `DATABASE_URL` set from `TEST_DATABASE_URL` in `.env.local`:

```powershell
$env:DATABASE_URL = (Get-Content .env.local | Where-Object { $_ -match '^TEST_DATABASE_URL=' }) -replace '^TEST_DATABASE_URL=', ''
node scripts/migrate.mjs
```

Expected: `applied 004_assistant_chat_history.sql`.

- [ ] **Step 3: Run tests to verify failure**

Run: `pnpm vitest run functions/__tests__/history.test.ts`
Expected: FAIL because `functions/chat/history.ts` does not exist.

- [ ] **Step 4: Implement migration and helpers**

Migration exactly as §7 of the spec. Cursor is opaque base64url JSON `{ lastMessageAt, id }`; validate with Zod. List query uses `limit + 1`, `exists` guard for visible messages, `order by last_message_at desc, id desc`, and tuple cursor comparison. Delete uses `returning id` and throws `ApiError('NOT_FOUND', 'Conversation not found')` when absent. `getOwnedAssistantConversation` does the same for reads.

- [ ] **Step 5: Run tests**

Run: `pnpm vitest run functions/__tests__/history.test.ts functions/__tests__/conversations.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add db/migrations/004_assistant_chat_history.sql functions/chat/history.ts functions/__tests__/history.test.ts src/lib/chat/protocol.ts
git commit -m "feat(chat): store assistant chat history"
```

---

### Task 2: Conversation-aware AI turns and titles

**Files:**
- Modify: `functions/chat/ai.ts`
- Modify: `functions/__tests__/ai.test.ts`

**Interfaces:**
- Consumes: Task 1 helpers.
- Produces: `beginAssistantTurn(pool, input: { userId; body; clientId; conversationId?: string })`.

- [ ] **Step 1: Write failing tests**

Add tests to `functions/__tests__/ai.test.ts`:
- omitting `conversationId` creates a new assistant conversation and sets its title from the body;
- passing an owned id reuses that conversation and does not create another;
- passing another user’s id throws `NOT_FOUND`;
- passing an owner conversation id throws `NOT_FOUND`;
- editing the earliest user message retitles the conversation; editing a later one does not;
- retry does not change the title.

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm vitest run functions/__tests__/ai.test.ts`
Expected: FAIL because `beginAssistantTurn` does not accept `conversationId`.

- [ ] **Step 3: Implement**

Use `getOwnedAssistantConversation` when an id is present, otherwise `createAssistantConversation`. After `createMessage` for the user message, call `setAssistantTitleIfEmpty`. In `beginAssistantEdit`, after updating the message, call `retitleAssistantConversation` with the edited message seq. Import from `./history`.

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run functions/__tests__/ai.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add functions/chat/ai.ts functions/__tests__/ai.test.ts
git commit -m "feat(chat): scope assistant turns to a conversation"
```

---

### Task 3: API list, delete, and conversation-aware reads

**Files:**
- Modify: `functions/api.ts`
- Modify: `src/lib/chat/protocol.ts` if schemas were not finalized in Task 1
- Test: `functions/__tests__/history.test.ts`, `src/lib/chat/__tests__/protocol.test.ts`

**Interfaces:**
- Consumes: Task 1 helpers and schemas.
- Produces routes:
  - `GET /api/conversations/assistant`
  - `GET /api/conversations/assistant/messages?conversationId=`
  - `DELETE /api/conversations/:id`
  - `POST /api/chat/assistant` accepts optional `conversationId`.

- [ ] **Step 1: Write failing protocol tests**

Add assertions for assistant history query parsing, optional `conversationId`, and required UUID on message reads. Run `pnpm vitest run src/lib/chat/__tests__/protocol.test.ts`; expect FAIL.

- [ ] **Step 2: Implement schemas**

Add `AssistantConversationDTO`, `AssistantConversationPage`, `assistantHistoryQuerySchema` (limit 1–50 default 20, `before` optional), `assistantMessagesQuerySchema` (pagination plus required UUID), and `assistantSendSchema` (send plus optional UUID).

- [ ] **Step 3: Implement routes**

- List route authenticates, resolves the app user, returns `listAssistantConversations`.
- Assistant messages route requires `conversationId`, verifies ownership/kind, and calls `listMessages`. Owner route keeps `getOrCreateConversation`.
- Delete route authenticates, resolves the user, calls `deleteAssistantConversation`, returns `{ ok: true }`.
- Assistant send route parses `assistantSendSchema`, passes `conversationId` into `beginAssistantTurn`.

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run src/lib/chat/__tests__/protocol.test.ts functions/__tests__/history.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add functions/api.ts src/lib/chat/protocol.ts src/lib/chat/__tests__/protocol.test.ts
git commit -m "feat(chat): add history API routes"
```

---

### Task 4: Conversation-aware client thread

**Files:**
- Modify: `src/lib/chat/use-chat-thread.ts`
- Create: `src/lib/chat/use-assistant-history.ts`
- Test: `src/lib/chat/__tests__/use-chat-thread.test.ts` (new), `src/lib/chat/__tests__/stream.test.ts`

**Interfaces:**
- Consumes: protocol DTOs.
- Produces:
  - `useChatThread` options `conversationId?: string | null`, `onConversationStarted?: (id: string) => void`, `onConversationLost?: (id: string, body: string) => void`.
  - Controller method `reset(): void`.
  - `useAssistantConversations(enabled: boolean)` returning an infinite query with `AssistantConversationPage`.
  - `useDeleteAssistantConversation(): (id: string) => Promise<void>`.

- [ ] **Step 1: Write failing tests**

- Assistant query path includes `conversationId`; no fetch when it is null.
- Send body includes `conversationId` when present and omits it for a draft.
- `onConversationStarted` fires once from `meta` when the client started from a draft.
- `reset()` clears pending and streaming state.
- `NOT_FOUND` during send calls `onConversationLost` with the body.
- History hook builds the list path and cursor correctly.
- Delete invalidates both history and the deleted thread key.

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm vitest run src/lib/chat/__tests__/use-chat-thread.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Update query keys to include `conversationId ?? 'draft'`; enable assistant query only when an id exists. Add `reset`. Handle `NOT_FOUND` in the stream `onError` before generic failure handling. Filter persisted messages whose id equals the live streaming id. Create `use-assistant-history.ts` with the two hooks from §10.

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run src/lib/chat/__tests__/use-chat-thread.test.ts src/lib/chat/__tests__/stream.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/chat/use-chat-thread.ts src/lib/chat/use-assistant-history.ts src/lib/chat/__tests__/use-chat-thread.test.ts src/lib/chat/__tests__/stream.test.ts
git commit -m "feat(chat): make client thread conversation aware"
```

---

### Task 5: History dialog, icon, and triggers

**Files:**
- Create: `src/components/chat/assistant-history-dialog.tsx`
- Modify: `src/components/ui/icons.tsx` (add `HistoryIcon` and `TrashIcon`)
- Modify: `src/components/chat/chat-thread-panel.tsx`
- Modify: `src/components/chat/chat-header.tsx` only if actions need layout changes
- Modify: `src/components/chat/chat-shell.tsx` (open state and props)
- Test: `src/components/chat/__tests__/assistant-history-dialog.test.tsx` (new), `src/components/chat/__tests__/chat-shell.test.tsx`

**Interfaces:**
- Consumes: Task 4 history hooks.
- Produces: `<AssistantHistoryDialog open conversations activeId isLoading error hasMore isFetchingMore onClose onNew onSelect onDelete onLoadMore />`.

- [ ] **Step 1: Write failing UI tests**

- Desktop header shows “Chat history” for an eligible assistant; hidden for owner inbox, signed-out, and AI-locked.
- Mobile floating trigger is rendered inside the thread for the assistant.
- Dialog lists titles, highlights active, calls select/new/delete, confirms delete, shows empty and error states.
- Keyboard Escape closes the native dialog.

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm vitest run src/components/chat/__tests__/assistant-history-dialog.test.tsx src/components/chat/__tests__/chat-shell.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Add `HistoryIcon` and `TrashIcon` with `StrokeIcon`. Dialog uses native `<dialog>` and `showModal`; render via ref/effect. Desktop right-side panel, mobile full-height sheet, backdrop with existing color tokens. Header action button only in assistant view. Floating button is `absolute left-3 top-3 z-10 md:hidden` inside the thread frame; add phone top padding to the assistant message list so the first message is not covered.

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run src/components/chat/__tests__/assistant-history-dialog.test.tsx src/components/chat/__tests__/chat-shell.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/assistant-history-dialog.tsx src/components/chat/chat-thread-panel.tsx src/components/chat/chat-shell.tsx src/components/chat/__tests__/assistant-history-dialog.test.tsx src/components/chat/__tests__/chat-shell.test.tsx src/components/ui/icons.tsx
git commit -m "feat(chat): add assistant history dialog"
```

---

### Task 6: Shell selection, switching, deletion, and recovery

**Files:**
- Modify: `src/components/chat/chat-shell.tsx`
- Modify: `src/components/chat/chat-thread-panel.tsx`
- Test: `src/components/chat/__tests__/chat-shell.test.tsx`

**Interfaces:**
- Consumes: Task 4 hooks and Task 5 dialog.
- Produces: complete assistant history behavior.

- [ ] **Step 1: Write failing tests**

- `auto` selects the first history item when data loads.
- Sending on a draft omits `conversationId`; when meta returns an id, selection becomes that chat and history invalidates.
- Selecting a chat passes its id to the thread hook.
- New chat clears the selection and keeps a separate draft.
- Switching while streaming confirms, stops, and resets.
- Deleting active chat falls back to `auto`; deleting inactive chat leaves selection.
- Stale chat send restores the body under “new”, falls back to `auto`, and shows the notice.
- Owner inbox still has no history trigger.

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm vitest run src/components/chat/__tests__/chat-shell.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Add `AssistantSelection`, resolve `auto` from the loaded list without an effect, keep assistant drafts keyed by conversation id or `'new'`, and pass `conversationId` into `useChatThread`. Implement switch/new/delete handlers with stream confirmation and `reset()`. Add `notice` prop to `ChatThreadPanel` rendered above the message list. Invalidate history after send, delete, and conversation creation.

- [ ] **Step 4: Run tests**

Run: `pnpm vitest run src/components/chat/__tests__/chat-shell.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/chat-shell.tsx src/components/chat/chat-thread-panel.tsx src/components/chat/__tests__/chat-shell.test.tsx
git commit -m "feat(chat): wire assistant history switching"
```

---

### Task 7: Verification, docs, migration, deployment

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-11-12-portfolio-chat-design.md` only if it claims one assistant conversation per user
- Test: full suite

- [ ] **Step 1: Update docs**

Document multiple assistant chats, title rule, delete behavior, and the migration. Remove any “one assistant conversation” claim.

- [ ] **Step 2: Run full gate**

Run each, in order:

```bash
pnpm test
pnpm typecheck
pnpm check
pnpm build
```

Expected: all pass. Only the intentional `target-cursor.tsx` React Doctor warning may remain.

- [ ] **Step 3: Apply migration to production branch**

Run `node --env-file=.env.local scripts/migrate.mjs` with the production `DATABASE_URL`.
Expected: `applied 004_assistant_chat_history.sql`.

- [ ] **Step 4: Deploy Neon Function env/source**

```bash
npx --yes neon@latest deploy --env .env.deploy
```

Expected: `Applied changes` with `~ function api`.

- [ ] **Step 5: Verify production**

- `/api/health` returns 200 `{ ok: true }`.
- Create two assistant chats; both appear in history.
- Switch between them; messages are isolated.
- Delete one; it disappears after confirm.
- Desktop trigger top-right, phone trigger floating top-left inside the chat.
- Deep-check that the existing assistant thread still contains its messages.

- [ ] **Step 6: Commit**

```bash
git add README.md docs
git commit -m "docs(chat): document assistant chat history"
```
