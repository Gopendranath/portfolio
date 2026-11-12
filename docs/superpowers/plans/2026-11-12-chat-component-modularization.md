# Chat Component Modularization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the three largest chat components into `history/`, `thread/`, and `message/` domain folders without changing chat behavior.

**Architecture:** Three parallel subagents create independent feature folders while the existing root files remain in place. The main agent then switches shared imports, deletes the old root files, verifies the whole app, and reviews the diff. No barrels, no behavior changes.

**Tech Stack:** React 19, TypeScript, TanStack Query, Tailwind CSS 4, Biome 2.6.6, Vitest 5.1.0.

**Spec:** `docs/superpowers/specs/2026-11-12-chat-component-modularization-design.md`

## Global Constraints

- Components-only scope. Do not split `use-chat-thread.ts` or `use-assistant-chat.ts`.
- Preserve every public component name, prop, default, aria label, copy string, class name, query key, and callback behavior.
- No barrel files. Consumers import exact modules.
- Sibling files use `./`; cross-folder files use `@/` because Biome rejects `../` imports.
- Subagents create new modules but do not delete old root files or edit shared importers. The main agent owns cutover.
- Subagents do not commit, amend, or run repo-wide formatting.
- No worktree or branch. Work in the current checkout.
- Existing tests are the regression gate. Add no product behavior.

## Review Focus

- History dialog open/close, Escape/backdrop close, delete confirmation, loading/error/empty/list/load-more states stay identical.
- Auth, AI-lock, signed-in thread, edit eligibility, and history-button visibility stay identical.
- Message bubble editing focus restoration, streaming body, retry/stop actions, copy announcement, and own/incoming alignment stay identical.
- Owner inbox still renders through the flat `MessageList` and `OwnerThreadView`.
- Cross-folder imports resolve under Biome's `noRestrictedImports`.

---

### Task 1: Extract history module

**Files:**
- Create: `src/components/chat/history/format-activity.ts`
- Create: `src/components/chat/history/assistant-history-row.tsx`
- Create: `src/components/chat/history/assistant-history-content.tsx`
- Create: `src/components/chat/history/assistant-history-dialog.tsx`
- Create: `src/components/chat/history/__tests__/assistant-history-dialog.test.tsx`
- Reference, do not delete yet: `src/components/chat/assistant-history-dialog.tsx`
- Reference, do not delete yet: `src/components/chat/__tests__/assistant-history-dialog.test.tsx`

**Interfaces:**
- `formatActivity(value: string): string`
- `AssistantHistoryRow({ conversation, active, onSelect, onDelete }: AssistantHistoryRowProps)` where `AssistantHistoryRowProps = { conversation: AssistantConversationDTO; active: boolean; onSelect: () => void; onDelete: () => void }`
- `AssistantHistoryContent({ conversations, activeId, isLoading, error, hasMore, isFetchingMore, onSelect, onDelete, onLoadMore, onRetry }: AssistantHistoryContentProps)` where the props mirror the dialog fields of the same names, with `onSelect` and `onDelete` taking a conversation id.
- `AssistantHistoryDialog` keeps its current public props exactly.
- Produces the new module path `@/components/chat/history/assistant-history-dialog` for the main-agent cutover.

- [ ] **Step 1: Copy the existing test to the new folder and update its import**

Create `history/__tests__/assistant-history-dialog.test.tsx` from the existing test. Change only the component import to `@/components/chat/history/assistant-history-dialog`.

- [ ] **Step 2: Create `format-activity.ts`**

Move `timeFormatter`, `dateTimeFormatter`, and `formatActivity` from the old dialog unchanged.

- [ ] **Step 3: Create `assistant-history-row.tsx`**

Move `HistoryRow` unchanged and rename it `AssistantHistoryRow`. Keep the existing delete confirmation text and markup.

- [ ] **Step 4: Create `assistant-history-content.tsx`**

Move the scroll body from the dialog: loading skeleton, error/retry, empty state, `<ul>` of rows, and load-more button. Use `AssistantHistoryRow`. Keep every class and aria label.

- [ ] **Step 5: Create the new `assistant-history-dialog.tsx`**

Keep the same props, refs, open/close effects, backdrop fallback, header, and new-chat button. Replace the scroll body with `<AssistantHistoryContent … />`.

- [ ] **Step 6: Run the focused test**

Run: `pnpm exec vitest run src/components/chat/history/__tests__/assistant-history-dialog.test.tsx`

Expected: PASS.

- [ ] **Step 7: Check the new folder**

Run: `pnpm exec biome check src/components/chat/history`

Expected: no fixes, no diagnostics.

- [ ] **Step 8: Report**

Return the created file list, test result, Biome result, and any deviations. Do not delete old files or commit.

---

### Task 2: Extract thread module

**Files:**
- Create: `src/components/chat/thread/chat-thread-frame.tsx`
- Create: `src/components/chat/thread/thread-error.tsx`
- Create: `src/components/chat/thread/message-edit-policy.ts`
- Create: `src/components/chat/thread/signed-in-thread.tsx`
- Create: `src/components/chat/thread/chat-thread-panel.tsx`
- Reference, do not delete yet: `src/components/chat/chat-thread-panel.tsx`

**Interfaces:**
- `ChatThreadFrame({ profile, showHistory, onOpenHistory, children }: ChatThreadFrameProps)` where `ChatThreadFrameProps = { profile: ChatProfile; showHistory: boolean; onOpenHistory: () => void; children: ReactNode }`
- `ThreadError({ thread }: { thread: ChatThreadController })`
- `canEditMessage(message: ViewMessage, view: ChatProfileId, isOwner: boolean): boolean`
- `handleEditMessage(view: ChatProfileId, thread: ChatThreadController, id: string, body: string): void`
- `SignedInThread` keeps the current props exactly.
- `ChatThreadPanel` keeps its current public props exactly.
- Produces the new module path `@/components/chat/thread/chat-thread-panel` for the main-agent cutover.

- [ ] **Step 1: Create `chat-thread-frame.tsx`**

Move `ChatThreadFrame` unchanged: section shell, desktop `ChatHeader`, mobile history button. Use `@/components/chat/chat-avatar` and `@/components/chat/chat-header`.

- [ ] **Step 2: Create `thread-error.tsx`**

Move `ThreadError` unchanged.

- [ ] **Step 3: Create `message-edit-policy.ts`**

Move `canEditMessage` and `handleEditMessage` unchanged. Keep the existing window-confirm text and `void thread.edit(...)`.

- [ ] **Step 4: Create `signed-in-thread.tsx`**

Move `SignedInThread` unchanged. Import `ThreadError`, `SignedInThread` dependencies, and the shared flat `MessageList`/`ChatComposer` through `@/components/chat/...` aliases.

- [ ] **Step 5: Create the new `chat-thread-panel.tsx`**

Keep the same public props and auth/locked/signed-in branching. Import the new frame and signed-in module, plus the flat `AuthPanel`, `AiLockedPanel`, and profile data.

- [ ] **Step 6: Typecheck the new modules**

Run: `pnpm exec tsc -p tsconfig.app.json --noEmit --incremental false`

Expected: PASS. Old root imports still compile because the old panel remains in place.

- [ ] **Step 7: Check the new folder**

Run: `pnpm exec biome check src/components/chat/thread`

Expected: no fixes, no diagnostics.

- [ ] **Step 8: Report**

Return the created file list, typecheck result, Biome result, and any deviations. Do not delete old files or commit.

---

### Task 3: Extract message module

**Files:**
- Create: `src/components/chat/message/streaming-body.tsx`
- Create: `src/components/chat/message/message-body.tsx`
- Create: `src/components/chat/message/message-meta.tsx`
- Create: `src/components/chat/message/message-bubble.tsx`
- Create copies at: `src/components/chat/message/message-actions.tsx`, `src/components/chat/message/message-editor.tsx`, `src/components/chat/message/message-timestamp.tsx`, `src/components/chat/message/use-copy-feedback.ts`, `src/components/chat/message/use-message-editing.ts`
- Leave the original root copies in place until Task 4 cutover.
- Create: `src/components/chat/message/__tests__/message-bubble.test.tsx`
- Reference, do not delete yet: `src/components/chat/message-bubble.tsx`
- Reference, do not delete yet: `src/components/chat/__tests__/message-bubble.test.tsx`

**Interfaces:**
- `StreamingBody({ body }: { body: string })`
- `MessageBody({ message, isUser, editor }: MessageBodyProps)` where `MessageBodyProps = { message: ViewMessage; isUser: boolean; editor: MessageEditorState }`
- `MessageMeta` keeps the current props exactly.
- `MessageBubble` keeps its current public props exactly.
- Export `type MessageEditorState = ReturnType<typeof useMessageEditing>` from the moved hook.
- Produces the new module path `@/components/chat/message/message-bubble` for the main-agent cutover.

- [ ] **Step 1: Copy message-only children and hooks into `message/`**

Copy the five files listed above without changing their behavior. Update their internal imports to the new sibling paths. Keep `@/lib/chat/protocol` and `@/data/types` aliases. Leave the originals in place until Task 4 cutover.

- [ ] **Step 2: Copy the existing test and update its import**

Create `message/__tests__/message-bubble.test.tsx` from the existing test. Change only the component import to `@/components/chat/message/message-bubble`.

- [ ] **Step 3: Create `streaming-body.tsx`**

Move `StreamingBody` unchanged, including loading dots, cursor, delays, and motion-reduce behavior.

- [ ] **Step 4: Create `message-body.tsx`**

Move `MessageBody` unchanged. Import the moved `MessageEditor` and `MessageEditorState`.

- [ ] **Step 5: Create `message-meta.tsx`**

Move `MessageMeta` and `MessageMetaProps` unchanged. Import the moved `MessageActions` and `MessageTimestamp`.

- [ ] **Step 6: Create the new `message-bubble.tsx`**

Keep the same public props, avatar placement, edit-focus restoration, and body/meta composition. Import `ChatAvatar` through `@/components/chat/chat-avatar`, and the moved message children/hooks through siblings.

- [ ] **Step 7: Run the focused test**

Run: `pnpm exec vitest run src/components/chat/message/__tests__/message-bubble.test.tsx`

Expected: PASS.

- [ ] **Step 8: Check the new folder**

Run: `pnpm exec biome check src/components/chat/message`

Expected: no fixes, no diagnostics.

- [ ] **Step 9: Report**

Return the created and copied file list, test result, Biome result, and any deviations. Do not delete old files or commit.

---

### Task 4: Cut over shared imports and remove old files

**Files:**
- Modify: `src/components/chat/chat-shell.tsx`
- Modify: `src/components/chat/message-list.tsx`
- Delete: `src/components/chat/assistant-history-dialog.tsx`
- Delete: `src/components/chat/chat-thread-panel.tsx`
- Delete: `src/components/chat/message-bubble.tsx`
- Delete: `src/components/chat/message-actions.tsx`
- Delete: `src/components/chat/message-editor.tsx`
- Delete: `src/components/chat/message-timestamp.tsx`
- Delete: `src/components/chat/use-copy-feedback.ts`
- Delete: `src/components/chat/use-message-editing.ts`
- Delete: `src/components/chat/__tests__/assistant-history-dialog.test.tsx`
- Delete: `src/components/chat/__tests__/message-bubble.test.tsx`

**Interfaces:**
- Consumes: all three new module paths from Tasks 1–3.
- Produces: one final chat tree with no duplicate components.

- [ ] **Step 1: Update `chat-shell.tsx`**

Import `AssistantHistoryDialog` from `@/components/chat/history/assistant-history-dialog` and `ChatThreadPanel` from `@/components/chat/thread/chat-thread-panel`. Change nothing else.

- [ ] **Step 2: Update `message-list.tsx`**

Import `MessageBubble` from `@/components/chat/message/message-bubble`. Change nothing else.

- [ ] **Step 3: Search for stale imports**

Run: `rg -n "@/components/chat/(assistant-history-dialog|chat-thread-panel|message-bubble|message-actions|message-editor|message-timestamp|use-copy-feedback|use-message-editing)" src`

Expected: no matches. Sibling `./message-actions` imports inside the new `message/` folder are valid and do not match this check.

- [ ] **Step 4: Delete old root files**

Delete the eleven old files listed above.

- [ ] **Step 5: Format and lint**

Run: `pnpm check`

Expected: clean. Apply `pnpm format` only if Biome reports formatting changes, then rerun.

- [ ] **Step 6: Typecheck**

Run: `pnpm typecheck`

Expected: PASS.

- [ ] **Step 7: Run the full test suite**

Run: `pnpm test`

Expected: PASS. Test count may exceed 292 only if a test was accidentally duplicated; moved tests keep the count at 292.

- [ ] **Step 8: Build**

Run: `pnpm build`

Expected: PASS. Existing >500 kB chunk warning is unrelated.

- [ ] **Step 9: Inspect the final tree**

Run: `Get-ChildItem src/components/chat -Recurse -File | ForEach-Object { [pscustomobject]@{ Lines = (Get-Content $_.FullName).Count; Path = $_.FullName.Replace((Get-Location).Path + '\\', '') } } | Sort-Object Lines -Descending`

Expected: no new production component above roughly 150 lines; `chat-thread-panel.tsx` around 70, history dialog around 100, message bubble around 100.

- [ ] **Step 10: Review the diff**

Run: `git diff --stat` and `git diff -- src/components/chat`.

Expected: file moves, import updates, and extracted JSX only. No copy, class, aria, query-key, or callback changes.

- [ ] **Step 11: Commit**

```bash
git add src/components/chat
git commit -m "refactor(chat): split heavy components into domain modules"
```

- [ ] **Step 12: Dispatch a fresh reviewer**

Use a reviewer subagent on the last commit. Require one line per finding: `path:line: severity: problem. fix.` No praise, no scope creep. If findings are valid, fix them before claiming completion.

---

### Task 5: Final verification

**Files:** none.

- [ ] **Step 1: Re-run checks after any review fixes**

Run: `pnpm check && pnpm typecheck && pnpm test && pnpm build`

Expected: all pass.

- [ ] **Step 2: Confirm working tree**

Run: `git status --short`

Expected: clean, or only intentional follow-up changes that are reported.

- [ ] **Step 3: Report**

Report commit hash, final file tree, test count, build result, and reviewer findings.
