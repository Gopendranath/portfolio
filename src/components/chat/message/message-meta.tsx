import type { RefObject } from 'react'
import type { ChatMessage } from '@/data/types'
import type { ViewMessage } from '@/lib/chat/use-chat-thread'
import { MessageActions } from './message-actions'
import { MessageTimestamp } from './message-timestamp'

export interface MessageMetaProps {
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

export function MessageMeta({
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
