# Assistant chat history sessions — design

Status: approved approach, awaiting design approval
Date: 2026-11-12
Scope: assistant chat only. Owner inbox is unchanged.

## 1. Intent

Visitors need multiple AI conversations instead of one endless assistant thread. They can start a new chat, reopen an earlier one, and delete chats they no longer want. The history control lives top-right on desktop and floats top-left inside the chat window on phones.

## 2. Goals

- Multiple assistant conversations per user.
- History list ordered by most recent activity, newest first.
- New chat starts blank; a conversation is created by the first message.
- Existing single assistant thread is preserved as the first history entry.
- Select and delete history entries.
- Titles derived from the first user message.
- Desktop trigger in the assistant header, top-right.
- Phone trigger floating top-left inside the chat window.
- No empty conversations in history.

## 3. Non-goals

- Renaming chats.
- AI-generated titles.
- Cross-device restoration of the exact last-opened chat.
- Search inside history.
- Archiving, pinning, or folders.
- Multiple owner conversations per visitor.
- History for the owner inbox.

## 4. Current state

- `conversations` has `unique (user_id, kind)`, so one assistant and one owner conversation per user.
- Assistant messages are read from `/api/conversations/assistant/messages`; the server calls `getOrCreateConversation`.
- `POST /api/chat/assistant` inserts the user message and streaming assistant message into that single conversation.
- SSE `meta` already returns `conversationId`.
- Client thread state is keyed only by `kind`; no conversation selector exists.
- The assistant header is hidden on phones; the owner panel and composer are the only mobile chrome.

## 5. Approaches

### Data

1. **Reuse `conversations` (chosen).** Relax the uniqueness rule, add `title`, keep all existing message and edit behaviour scoped by `conversation_id`.
2. New `assistant_sessions` table. Rejected: duplicates ownership, timestamps, and message relationships that already live on `conversations`.
3. Browser-only history. Rejected: lost on reload or another device, and cannot list server-stored threads.

### Trigger and panel

1. **One accessible dialog (chosen).** Header icon on desktop; floating button inside the thread on phones. Same component, responsive panel.
2. Separate `/chat/history` route. Rejected: unmounts the composer and stream state.
3. Permanent sidebar list. Rejected: crowds the 280px profile panel and has no room on mobile.

## 6. Decisions

- Assistant conversations are created lazily on the first message. “New chat” only clears the active selection.
- Existing assistant conversation is kept and backfilled with a title.
- Owner conversations keep a partial unique index on `(user_id)` where `kind = 'owner'`.
- History is ordered by `last_message_at desc, id desc`. Any message bumps a chat to the top.
- Titles come from the first user message, normalized whitespace, first 80 characters. No extra model call. Editing that first message updates the title to the edited body.
- Chats with no visible messages are excluded from the list. Empty assistant conversations left by the old auto-create-on-read behaviour are deleted by the migration.
- Delete is a hard delete; messages and revisions cascade. `rate_limit_events` and `ai_usage` are keyed by user, not conversation, and are intentionally untouched so deleting a chat cannot refund quota.
- Active chat is auto-selected as the most recent on page load. Exact last-opened chat is not persisted across reloads.
- Switching or starting a new chat while streaming prompts for confirmation, stops the stream, resets transient thread state, then switches.
- Drafts are kept per assistant conversation so switching does not discard typed text.
- History applies to the assistant view for every signed-in, AI-eligible account, including the owner account. The owner inbox view has no history.
- If the active chat was deleted on the server, sending it returns 404. The client keeps the typed body, returns selection to the newest chat, refreshes history, and shows an inline notice.

## 7. Schema

New migration `db/migrations/004_assistant_chat_history.sql`:

```sql
alter table conversations
  add column if not exists title text
  check (title is null or char_length(title) between 1 and 80);

alter table conversations
  drop constraint if exists conversations_user_id_kind_key;

create unique index if not exists conversations_owner_per_user_idx
  on conversations (user_id)
  where kind = 'owner';

create index if not exists conversations_user_kind_recent_idx
  on conversations (user_id, kind, last_message_at desc, id desc);

-- Old GET behaviour created assistant conversations before the first message.
-- They have no history value and would never be selectable.
delete from conversations c
 where c.kind = 'assistant'
   and not exists (
     select 1 from messages m where m.conversation_id = c.id
   );

update conversations c
   set title = (
     select left(regexp_replace(m.body, '\s+', ' ', 'g'), 80)
       from messages m
      where m.conversation_id = c.id
        and m.author = 'user'
        and m.deleted_at is null
      order by m.seq
      limit 1
   )
 where c.kind = 'assistant'
   and c.title is null
   and exists (
     select 1 from messages m
      where m.conversation_id = c.id
        and m.author = 'user'
        and m.deleted_at is null
   );

update conversations
   set title = 'Earlier conversation'
 where kind = 'assistant'
   and title is null;
```

Notes:

- `last_message_at` is already updated by `createMessage`, so ordering needs no trigger.
- The partial owner index keeps the existing one-owner-thread invariant.
- Empty assistant conversations are deleted before titles are backfilled. Users with an old empty thread simply start their first real chat normally.
- A conversation with messages but no visible user message gets the fallback title.
- Backfill runs once per database. It does not touch owner conversations.
- `title` is nullable for owner conversations.

## 8. API

### Types (`src/lib/chat/protocol.ts`)

```ts
export interface AssistantConversationDTO {
  id: string
  title: string
  createdAt: string
  lastMessageAt: string
}

export interface AssistantConversationPage {
  conversations: AssistantConversationDTO[]
  hasMore: boolean
  nextCursor: string | null
}
```

Schemas:

- `assistantSendSchema = sendMessageSchema.extend({ conversationId: z.string().uuid().optional() })`
- `assistantMessagesQuerySchema = paginationSchema.extend({ conversationId: z.string().uuid() })`
- `assistantHistoryQuerySchema = { limit: 1..50, default 20; before?: string }`
- Cursor is opaque to the client. Server encodes `{ lastMessageAt, id }` as base64url and validates it on the next page.

### `GET /api/conversations/assistant`

Auth required. Returns only the caller’s assistant conversations with at least one visible message.

```sql
select c.id, c.title, c.created_at, c.last_message_at
  from conversations c
 where c.user_id = $1
   and c.kind = 'assistant'
   and exists (
     select 1 from messages m
      where m.conversation_id = c.id
        and m.deleted_at is null
        and m.status <> 'superseded'
   )
 order by c.last_message_at desc, c.id desc
 limit $2
```

Title fallback in the DTO: `title ?? 'Earlier conversation'`.

### `GET /api/conversations/assistant/messages?conversationId=<uuid>&limit=&before=`

- `conversationId` is required.
- Verify `conversations.user_id = caller` and `kind = 'assistant'`; otherwise `404 NOT_FOUND`.
- Reuse `listMessages`.
- No implicit creation on read. Missing or foreign id returns 404.
- Owner path and owner pagination stay as they are.

### `POST /api/chat/assistant`

Body:

```json
{ "body": "...", "clientId": "...", "conversationId": "uuid or omitted" }
```

- Omitted: create a new assistant conversation for the user, then insert the turn.
- Present: verify ownership and kind, use it; invalid id returns 404 before rate-limit consumption where practical.
- After the first user message, set `title = coalesce(title, normalized first message truncated to 80)`.
- Existing rate limits, eligibility gate, and SSE events are unchanged. `meta.conversationId` tells the client which chat was created.
- A stale `conversationId` returns 404 before any message is inserted. Client recovery is defined in §10.

### `DELETE /api/conversations/:id`

- Auth required.
- Delete only when `id`, `user_id = caller`, and `kind = 'assistant'`.
- Foreign or owner conversation returns `404`.
- `messages` and `message_revisions` cascade.
- Response `{ "ok": true }`.

### Message edit and retry

No route changes. Every existing edit/retry query already joins `conversations` and verifies ownership. They continue to operate inside the message’s own conversation.

When `beginAssistantEdit` edits the earliest visible user message in an assistant conversation, it also updates `conversations.title` with the edited body, normalized and truncated to 80 characters. Editing a later user message does not change the title. Retry never changes the title.

### Delete and quota

`DELETE /api/conversations/:id` removes the conversation, its messages, and its message revisions. It does not modify `rate_limit_events` or `ai_usage`; those are per-user and deleting history must not refund daily limits.

## 9. Server changes

- `functions/chat/conversations.ts`
  - Keep `getOrCreateConversation` for the owner path.
  - Add `createAssistantConversation(pool, userId)`.
  - Add `getOwnedAssistantConversation(pool, userId, conversationId)`.
  - Add `listAssistantConversations(pool, userId, { limit, before })`.
  - Add `deleteAssistantConversation(pool, userId, conversationId)`.
  - Add `touchConversationTitle` or set the title inside `beginAssistantTurn`.
- `functions/chat/ai.ts`
  - `beginAssistantTurn` accepts optional `conversationId`; verifies it or creates one.
  - On first user message, update the title only if null.
- `functions/api.ts`
  - Add list and delete routes.
  - Assistant message read requires `conversationId`.
  - Assistant send parses the optional id.
- Owner routes continue to use one owner conversation.

## 10. Client state

### New hook: `useAssistantHistory`

- `useInfiniteQuery` key `['chat', 'assistant-conversations']`, limit 20, cursor from `nextCursor`.
- Enabled when signed in and AI eligible. This includes accounts with `role = 'owner'` while they are in the assistant view.
- `useDeleteAssistantConversation` mutation invalidates the list and the thread query for that id.

### Selection model

Use a discriminated selection instead of an effect that copies derived state:

```ts
type AssistantSelection =
  | { type: 'auto' }          // initial: most recent chat
  | { type: 'new' }           // explicit new chat
  | { type: 'chat'; id: string }
```

`auto` resolves to the first item in the loaded history page, or `null` when history is empty. This gives the latest chat on load without a state-sync effect.

Because a brand-new chat is not in the list, `new` and `auto` both render a blank thread when history is empty.

### `useChatThread` changes

- New option `conversationId?: string | null`.
- New option `onConversationStarted?: (id: string) => void`.
- Query key includes the conversation id; draft thread does not fetch.
- Assistant send body includes `conversationId` when present.
- On `meta`, if the client was on a draft, call `onConversationStarted(meta.conversationId)`.
- Persisted messages with the same id as the live streaming message are filtered to avoid duplicates if a query starts mid-stream.
- `reset()` clears pending, streaming, fork state, and aborts, used when switching or deleting a chat.
- Switching handler: if streaming, confirm; on confirm stop and reset; then set selection.
- Delete active chat: stop if streaming, delete, set selection to `auto`.
- Delete inactive chat: invalidate history only.
- Assistant drafts keyed by conversation id or `'new'`.
- If an assistant send with an existing id fails with `NOT_FOUND`, the hook calls `onConversationLost(conversationId, body)`. The shell restores the body to the new-chat draft, resets thread state, sets selection to `auto`, invalidates history, and shows “This chat was deleted. Your message was not sent.” No automatic resend, so the user chooses when to send again.

## 11. UI

### Trigger

- Desktop: `HistoryIcon` button in `ChatHeader` `actions`, right side of the assistant header. `aria-label="Chat history"`. Hidden in the owner inbox view, signed-out, or AI-locked states. Available to the owner account while it is in the assistant view.
- Phone: same button rendered as a floating square/circle at `absolute left-3 top-3 z-10` inside the chat thread frame, visible below `md`. The assistant message list gets top padding on phones so the button does not cover content.
- Add `HistoryIcon` to `src/components/ui/icons.tsx` using the existing `StrokeIcon` style.

### `AssistantHistoryDialog`

- Native `<dialog>` opened with `showModal()`; Escape and backdrop close it; focus returns to the trigger.
- Desktop: right-side panel, about 20rem wide, full height of the chat area.
- Phone: full-height sheet with a header and close button.
- Contents:
  - “New chat” button.
  - List rows: title (truncated), last activity time, active highlight, delete button.
  - Delete asks `window.confirm('Delete this chat? This cannot be undone.')`.
  - Delete button stops row selection via `stopPropagation`.
  - Empty state: “No previous chats yet.”
  - Loading skeleton and inline retry on error.
  - “Load more” when `hasMore`.
- Row time format: existing compact 24-hour formatter; include date when not today.
- Dialog closes after selecting or creating.

## 12. Edge cases

- **Conversation deleted in another tab:** message fetch returns 404; the client switches selection to `auto` and refreshes history.
- **Send fails before `meta`:** the client remains on the draft. If the server did create a conversation, it will appear in history on the next refresh.
- **Delete during stream:** client stops first. A late server update to a deleted message affects zero rows and is harmless.
- **Title with only whitespace:** impossible because message bodies are normalized before insert.
- **Long first message:** stored title is exactly 80 characters; UI truncates with CSS.
- **All histories deleted:** selection resolves to `null`; blank thread with empty history state.
- **Owner account:** history is available in the assistant view. The owner inbox view has no history button and keeps its single visitor thread per person.
- **AI locked or signed out:** no history button; no list request.
- **Send to a chat deleted in another tab:** the send is rejected, the typed body is restored, selection falls back to newest, and an inline notice explains that nothing was sent.

## 13. Testing

- Protocol tests for the new schemas and DTO parsing.
- DB tests on `TEST_DATABASE_URL` (`test-clean`):
  - two assistant conversations allowed for one user;
  - owner uniqueness still enforced;
  - list sorted by recent activity and excludes empty conversations;
  - first user message sets title, later messages do not overwrite it;
  - editing the first user message updates the title; editing a later one does not;
  - foreign user cannot read or delete a conversation;
  - delete cascades messages and revisions but leaves `ai_usage` and `rate_limit_events` intact;
  - existing single assistant thread survives migration and appears in history;
  - empty legacy assistant conversations are removed by the migration.
- AI helper tests:
  - send with no conversation id creates one;
  - send with an owned id reuses it;
  - foreign id is rejected.
- Client tests:
  - history trigger appears for eligible assistant only;
  - dialog lists chats, selects one, starts new, deletes with confirmation;
  - streaming switch confirmation path;
  - draft preserved per chat;
  - no list request for the owner inbox view or a locked user; the owner account does get history in the assistant view.
- Full gate: `pnpm test`, `pnpm typecheck`, `pnpm check`, `pnpm build`.
- Manual: desktop 1280×900 and phone 390×844; create two chats, switch, confirm composer and titles; delete active and inactive; reload and land on the newest.

## 14. Risks and trade-offs

- **First-prompt titles.** Cheap and predictable, but sometimes poor labels. Acceptable for v1; AI titles can be added later without a schema change.
- **Lazy creation race.** A failed send can leave a server-side conversation the client has not seen. It is harmless and appears in history later.
- **Hard delete.** No recovery. Confirmation is the only guard. This matches the user’s selected scope. Quota rows stay, so deletion cannot be used to reset limits.
- **No cross-device active-chat restore.** Latest activity is a predictable fallback and avoids another write per switch.
- **Stale chat recovery keeps the draft.** Users must press Send again after a chat is deleted elsewhere. The alternative, automatic resend, risks surprising double sends.
- **Native dialog styling.** Needs explicit mobile sizing and backdrop styles; chosen for built-in focus management.
- **Sorting with `last_message_at`.** Soft-deleted later messages do not lower a chat, but the conversation remains recent. Expected: editing an old chat bumps it.

## 15. Left to the builder

- Exact cursor encoding and decode validation.
- Whether the history query polls; default is no polling, invalidate after send/delete.
- Whether mobile panel is full-screen or 85vw; full-height sheet is preferred.
- Exact `HistoryIcon` path.
- Test fixture helpers for multiple conversations.
