# Chat Component Modularization — Design

Date: 2026-11-12
Status: Approved

## Intent

The three largest chat components stack several responsibilities in one file. Split them into domain folders so each file has one reason to change, without changing chat behavior, data flow, styling, or copy.

## Goals

- Reduce `assistant-history-dialog.tsx`, `chat-thread-panel.tsx`, and `message-bubble.tsx` to focused orchestration shells.
- Group history, thread, and message concerns by feature.
- Keep all components and hooks at their current behavioral boundaries; this is a file-structure refactor.
- Keep existing test coverage and add no new product behavior.
- Let three subagents work on disjoint paths, with the main agent handling shared imports.

## Non-goals

- Splitting `use-chat-thread.ts`.
- Changing chat state ownership, React Query keys, streaming behavior, or message actions.
- Redesigning the chat UI or changing copy.
- Reorganizing owner inbox, profile, composer, or shared header/avatar components.
- Adding barrel files.

## Current shape

Largest files:

| File | Lines | Responsibilities |
|---|---:|---|
| `assistant-history-dialog.tsx` | 248 | dialog lifecycle, backdrop, row, list states, pagination |
| `chat-thread-panel.tsx` | 246 | frame, auth gate, AI lock, signed-in thread, edit policy |
| `message-bubble.tsx` | 225 | shell, streaming body, body/editor switch, metadata/actions |

`use-chat-thread.ts` is larger but explicitly out of scope.

## Approaches considered

### A. Flat extraction

Extract internal components as siblings in `src/components/chat`. Lowest churn, but the flat folder grows to roughly 30 files and concerns remain hard to locate.

### B. Domain folders (chosen)

Create `history/`, `thread/`, and `message/` folders only for the three heavy areas. Leave shared chat pieces flat. Good locality with contained import churn.

### C. Full chat restructure

Group profile, owner, composer, history, thread, message, and shared into folders. Cleanest end state, but touches nearly every chat file for little extra benefit in this pass.

## Chosen design

```text
src/components/chat/
  __tests__/
    chat-shell.test.tsx
    owner-inbox.test.tsx
  history/
    __tests__/
      assistant-history-dialog.test.tsx
    assistant-history-dialog.tsx
    assistant-history-content.tsx
    assistant-history-row.tsx
    format-activity.ts
  message/
    __tests__/
      message-bubble.test.tsx
    message-bubble.tsx
    message-body.tsx
    message-meta.tsx
    streaming-body.tsx
    message-actions.tsx
    message-editor.tsx
    message-timestamp.tsx
    use-copy-feedback.ts
    use-message-editing.ts
  thread/
    chat-thread-panel.tsx
    chat-thread-frame.tsx
    signed-in-thread.tsx
    thread-error.tsx
    message-edit-policy.ts
  chat-shell.tsx
  chat-profile-panel.tsx
  chat-composer.tsx
  chat-header.tsx
  chat-avatar.tsx
  owner-inbox.tsx
  owner-thread-view.tsx
  message-list.tsx
  profile-list.tsx
  chat-nav-card.tsx
  auth-panel.tsx
  ai-locked-panel.tsx
  chat-shell.css
```

### History

- `assistant-history-dialog.tsx`: dialog refs, open/close effects, backdrop fallback, header, new-chat action.
- `assistant-history-content.tsx`: scroll body, loading/error/empty states, conversation list, load-more.
- `assistant-history-row.tsx`: single selectable/deletable row.
- `format-activity.ts`: formatters and `formatActivity`.

### Thread

- `chat-thread-panel.tsx`: chooses auth, locked, or signed-in state.
- `chat-thread-frame.tsx`: section shell, desktop header, mobile history button.
- `signed-in-thread.tsx`: error/notice banners, message list, composer.
- `thread-error.tsx`: retry banner.
- `message-edit-policy.ts`: `canEditMessage` and edit confirmation policy.

### Message

- `message-bubble.tsx`: article shell, avatar placement, edit-focus restoration.
- `message-body.tsx`: editing/body switch and bubble styling.
- `streaming-body.tsx`: empty streaming dots and cursor.
- `message-meta.tsx`: status, timestamp, actions, stop control, live copy announcement.
- Existing message actions, editor, timestamp, and hooks move into `message/` because every consumer is message-specific.

### Interface rules

- Import siblings with `./`; other folders with `@/`.
- Keep public component names and props unchanged.
- No barrel files. Consumers import the exact module.
- Move each test beside its new module under `__tests__`.
- Shared root chat files keep their current paths.

## Execution

Three parallel subagents own disjoint paths:

1. **History agent** — create `history/`, move the dialog and its test, extract content/row/formatter.
2. **Thread agent** — create `thread/`, split the panel into frame/signed-in/error/policy.
3. **Message agent** — create `message/`, split the bubble and move message-only children/hooks/test.

The main agent updates shared importers (`chat-shell.tsx`, `message-list.tsx`), resolves conflicts, and runs verification. Subagents do not commit or run repo-wide formatting.

## Verification

- `pnpm check`
- `pnpm typecheck`
- `pnpm test` — expected 45 files / 292 tests
- `pnpm build`
- Inspect diff for behavior changes; only imports, file moves, and extracted rendering should appear.
- Confirm no target file exceeds roughly 150 lines.

## Risks

- Import churn from moving message primitives and tests.
- Parallel agents touching shared imports; mitigated by reserving shared files for the main agent.
- Silent behavior drift during JSX moves; mitigated by unchanged props and existing tests.
