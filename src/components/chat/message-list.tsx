import { useLayoutEffect, useRef } from 'react'
import type { ChatProfile } from '@/data/types'
import type { ViewMessage } from '@/lib/chat/use-chat-thread'
import { MessageBubble } from './message-bubble'

interface MessageListProps {
  messages: readonly ViewMessage[]
  profile: ChatProfile
  hasMore: boolean
  isFetchingOlder: boolean
  isLoading: boolean
  canEditMessage: (message: ViewMessage) => boolean
  onLoadOlder: () => Promise<void>
  onEditMessage: (id: string, body: string) => void
  onRetryMessage: (message: ViewMessage) => void
  onStop?: () => void
}

export function MessageList({
  messages,
  profile,
  hasMore,
  isFetchingOlder,
  isLoading,
  canEditMessage,
  onLoadOlder,
  onEditMessage,
  onRetryMessage,
  onStop,
}: MessageListProps) {
  const logRef = useRef<HTMLDivElement>(null)
  const previousHeightRef = useRef(0)
  const previousTopRef = useRef(0)
  const prependRef = useRef(false)
  const countRef = useRef(0)
  const threadRef = useRef(profile.id)

  useLayoutEffect(() => {
    const log = logRef.current
    if (!log) {
      return
    }

    const changedThread = threadRef.current !== profile.id
    const grew = messages.length > countRef.current

    threadRef.current = profile.id
    countRef.current = messages.length

    if (prependRef.current && grew) {
      const addedHeight = log.scrollHeight - previousHeightRef.current
      log.scrollTop = previousTopRef.current + addedHeight
      prependRef.current = false
      return
    }

    if (changedThread || grew) {
      log.scrollTop = log.scrollHeight
    }
  }, [messages, profile.id])

  async function handleLoadOlder() {
    const log = logRef.current
    if (log) {
      prependRef.current = true
      previousHeightRef.current = log.scrollHeight
      previousTopRef.current = log.scrollTop
    }
    await onLoadOlder()
  }

  return (
    <div
      ref={logRef}
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      aria-label={`${profile.name} messages`}
      className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 [scrollbar-gutter:stable] sm:p-5"
    >
      {hasMore ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => {
              void handleLoadOlder()
            }}
            disabled={isFetchingOlder}
            className="border border-line px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted transition-colors hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-50"
          >
            {isFetchingOlder ? 'Loading…' : 'Load previous messages'}
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-3" role="status" aria-label="Loading messages">
          <div className="h-10 w-2/3 animate-pulse border border-line bg-surface/40" />
          <div className="ml-auto h-10 w-1/2 animate-pulse border border-line bg-surface/40" />
          <div className="h-10 w-3/4 animate-pulse border border-line bg-surface/40" />
        </div>
      ) : null}

      {!isLoading && messages.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          No messages yet. Start the conversation.
        </p>
      ) : null}

      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          profile={profile}
          canEdit={canEditMessage(message)}
          onEdit={onEditMessage}
          onRetry={onRetryMessage}
          onStop={onStop}
        />
      ))}
    </div>
  )
}
