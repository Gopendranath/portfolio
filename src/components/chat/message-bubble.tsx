import { useEffect, useRef } from 'react'
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
  canEdit?: boolean
  canRetry?: boolean
  onEdit: (id: string, body: string) => void
  onRetry?: (message: ViewMessage) => void
  onStop?: () => void
}

export function MessageBubble({
  message,
  profile,
  canEdit = message.author === 'user',
  canRetry = false,
  onEdit,
  onRetry,
  onStop,
}: MessageBubbleProps) {
  const isUser = message.author === 'user'
  const actionsRef = useRef<HTMLDivElement>(null)
  const wasEditing = useRef(false)
  const { copyLabel, copyAnnouncement, copyMessage } = useCopyFeedback(
    message.body,
  )
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
      actionsRef.current
        ?.querySelector<HTMLButtonElement>('[data-message-action="edit"]')
        ?.focus()
    }

    wasEditing.current = editor.isEditing
  }, [editor.isEditing])

  const isStreaming = message.status === 'streaming'
  const isFailed = message.status === 'failed'
  const isSending = message.status === 'sending'

  return (
    <article
      aria-label={isUser ? 'You' : profile.name}
      className={`group flex items-end gap-2.5 ${isUser ? 'justify-end' : ''}`}
    >
      {isUser ? null : <ChatAvatar profile={profile} size="sm" />}
      <div
        className={`min-w-0 ${
          editor.isEditing
            ? 'w-full max-w-[85%] md:max-w-[36rem]'
            : 'max-w-[85%]'
        }`}
      >
        {isUser ? null : (
          <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
            {profile.name}
          </p>
        )}

        {editor.isEditing ? (
          <MessageEditor
            draft={editor.draft}
            onChange={editor.setDraft}
            onCancel={editor.cancelEditing}
            onSave={editor.saveEdit}
            onKeyDown={editor.handleEditorKeyDown}
          />
        ) : (
          <p
            className={`whitespace-pre-wrap break-words border px-3.5 py-2.5 text-sm leading-relaxed ${
              isUser
                ? 'border-accent bg-accent text-accent-ink'
                : 'border-line bg-surface/70 text-ink'
            }`}
          >
            {isStreaming && !message.body ? (
              <span className="inline-flex items-center gap-1 text-muted">
                <span className="size-1.5 animate-pulse rounded-full bg-accent" />
                <span className="size-1.5 animate-pulse rounded-full bg-accent [animation-delay:120ms]" />
                <span className="size-1.5 animate-pulse rounded-full bg-accent [animation-delay:240ms]" />
              </span>
            ) : (
              message.body
            )}
            {isStreaming && message.body ? (
              <span
                aria-hidden="true"
                className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-accent align-[-2px] motion-reduce:animate-none"
              />
            ) : null}
          </p>
        )}

        <div
          className={`mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[9px] tracking-[0.12em] text-muted ${
            isUser ? 'justify-end' : ''
          }`}
        >
          {isSending ? <span>sending…</span> : null}
          {isFailed ? <span className="text-red-400">failed</span> : null}
          {editor.isEditing ? null : (
            <>
              <MessageTimestamp message={uiMessage} />
              <MessageActions
                ref={actionsRef}
                canEdit={canEdit}
                canRetry={canRetry || isFailed}
                copyLabel={copyLabel}
                onCopy={copyMessage}
                onEdit={editor.startEditing}
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
      </div>
    </article>
  )
}
