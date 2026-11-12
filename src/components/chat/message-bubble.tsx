import { type RefObject, useEffect, useRef } from 'react'
import type { ChatMessage, ChatProfile } from '@/data/types'
import type { ViewMessage } from '@/lib/chat/use-chat-thread'
import { ChatAvatar } from './chat-avatar'
import { MessageActions } from './message-actions'
import { MessageEditor } from './message-editor'
import { MessageTimestamp } from './message-timestamp'
import { useCopyFeedback } from './use-copy-feedback'
import { useMessageEditing } from './use-message-editing'

interface MessageBubbleProps {
  message: ViewMessage
  profile: ChatProfile
  ownAuthor?: 'user' | 'owner'
  incomingLabel?: string
  canEdit?: boolean
  canRetry?: boolean
  onEdit: (id: string, body: string) => void
  onRetry?: (message: ViewMessage) => void
  onStop?: () => void
}

type MessageEditorState = ReturnType<typeof useMessageEditing>

function StreamingBody({ body }: { body: string }) {
  if (!body) {
    return (
      <span className="inline-flex items-center gap-1 text-muted">
        <span className="size-1.5 animate-pulse rounded-full bg-accent" />
        <span className="size-1.5 animate-pulse rounded-full bg-accent [animation-delay:120ms]" />
        <span className="size-1.5 animate-pulse rounded-full bg-accent [animation-delay:240ms]" />
      </span>
    )
  }

  return (
    <>
      {body}
      <span
        aria-hidden="true"
        className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-accent align-[-2px] motion-reduce:animate-none"
      />
    </>
  )
}

function MessageBody({
  message,
  isUser,
  editor,
}: {
  message: ViewMessage
  isUser: boolean
  editor: MessageEditorState
}) {
  if (editor.isEditing) {
    return (
      <MessageEditor
        draft={editor.draft}
        onChange={editor.setDraft}
        onCancel={editor.cancelEditing}
        onSave={editor.saveEdit}
        onKeyDown={editor.handleEditorKeyDown}
      />
    )
  }

  return (
    <p
      className={`whitespace-pre-wrap break-words border px-3.5 py-2.5 text-sm leading-relaxed ${
        isUser ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-surface/70 text-ink'
      }`}
    >
      {message.status === 'streaming' ? <StreamingBody body={message.body} /> : message.body}
    </p>
  )
}

interface MessageMetaProps {
  message: ViewMessage
  uiMessage: ChatMessage
  isUser: boolean
  isEditing: boolean
  canEdit: boolean
  canRetry: boolean
  actionsRef: RefObject<HTMLDivElement | null>
  copyLabel: string
  copyAnnouncement: string
  onCopy: () => void
  onStartEdit: () => void
  onRetry?: (message: ViewMessage) => void
  onStop?: () => void
}

function MessageMeta({
  message,
  uiMessage,
  isUser,
  isEditing,
  canEdit,
  canRetry,
  actionsRef,
  copyLabel,
  copyAnnouncement,
  onCopy,
  onStartEdit,
  onRetry,
  onStop,
}: MessageMetaProps) {
  const isStreaming = message.status === 'streaming'
  const isFailed = message.status === 'failed'
  const isSending = message.status === 'sending'
  const isRetryable =
    isFailed && (message.clientId !== null || /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(message.id))

  return (
    <div
      className={`mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[9px] tracking-[0.12em] text-muted ${
        isUser ? 'justify-end' : ''
      }`}
    >
      {isSending ? <span>sending…</span> : null}
      {isFailed ? <span className="text-red-400">failed</span> : null}
      {isEditing ? null : (
        <>
          <MessageTimestamp message={uiMessage} />
          <MessageActions
            ref={actionsRef}
            canEdit={canEdit}
            canRetry={canRetry || isRetryable}
            copyLabel={copyLabel}
            onCopy={onCopy}
            onEdit={onStartEdit}
            onRetry={() => onRetry?.(message)}
          />
          {isStreaming && onStop ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop response"
              className="border border-line px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted transition-colors hover:border-accent hover:text-accent"
            >
              Stop
            </button>
          ) : null}
        </>
      )}
      <span className="sr-only" aria-live="polite">
        {copyAnnouncement}
      </span>
    </div>
  )
}

export function MessageBubble({
  message,
  profile,
  ownAuthor = 'user',
  incomingLabel,
  canEdit,
  canRetry = false,
  onEdit,
  onRetry,
  onStop,
}: MessageBubbleProps) {
  const isUser = message.author === ownAuthor
  const canEditMessage = canEdit ?? message.author === ownAuthor
  const actionsRef = useRef<HTMLDivElement>(null)
  const wasEditing = useRef(false)
  const { copyLabel, copyAnnouncement, copyMessage } = useCopyFeedback(message.body)
  const uiMessage: ChatMessage = {
    id: message.id,
    author: message.author,
    body: message.body,
    sentAt: Date.parse(message.sentAt),
    editedAt: message.editedAt ? Date.parse(message.editedAt) : undefined,
  }
  const editor = useMessageEditing({ message: uiMessage, onEdit })

  useEffect(() => {
    if (wasEditing.current && !editor.isEditing) {
      actionsRef.current?.querySelector<HTMLButtonElement>('[data-message-action="edit"]')?.focus()
    }

    wasEditing.current = editor.isEditing
  }, [editor.isEditing])

  return (
    <article
      aria-label={isUser ? 'You' : (incomingLabel ?? profile.name)}
      className={`group flex items-end gap-2.5 ${isUser ? 'justify-end' : ''}`}
    >
      {isUser ? null : <ChatAvatar profile={profile} label={incomingLabel} size="sm" />}
      <div
        className={`min-w-0 ${
          editor.isEditing ? 'w-full max-w-[85%] md:max-w-[36rem]' : 'max-w-[85%]'
        }`}
      >
        {isUser ? null : (
          <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
            {incomingLabel ?? profile.name}
          </p>
        )}

        <MessageBody message={message} isUser={isUser} editor={editor} />

        <MessageMeta
          message={message}
          uiMessage={uiMessage}
          isUser={isUser}
          isEditing={editor.isEditing}
          canEdit={canEditMessage}
          canRetry={canRetry}
          actionsRef={actionsRef}
          copyLabel={copyLabel}
          copyAnnouncement={copyAnnouncement}
          onCopy={copyMessage}
          onStartEdit={editor.startEditing}
          onRetry={onRetry}
          onStop={onStop}
        />
      </div>
    </article>
  )
}
