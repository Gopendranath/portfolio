import { useEffect, useRef } from 'react'
import type { ChatMessage, ChatProfile } from '@/data/types'
import { MessageBubble } from './message-bubble'

interface MessageListProps {
  messages: readonly ChatMessage[]
  profile: ChatProfile
  onEditMessage: (id: string, body: string) => void
}

export function MessageList({
  messages,
  profile,
  onEditMessage,
}: MessageListProps) {
  const logRef = useRef<HTMLDivElement>(null)
  const threadRef = useRef(profile.id)
  const countRef = useRef(0)

  // Only follow the newest message: scrolling on every change would yank the
  // viewport while an older message is being edited.
  useEffect(() => {
    const log = logRef.current

    if (!log) {
      return
    }

    const changedThread = threadRef.current !== profile.id
    const grew = messages.length > countRef.current

    threadRef.current = profile.id
    countRef.current = messages.length

    if (changedThread || grew) {
      log.scrollTop = log.scrollHeight
    }
  }, [messages, profile.id])

  return (
    <div
      ref={logRef}
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      aria-label={`${profile.name} messages`}
      className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 [scrollbar-gutter:stable] sm:p-5"
    >
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          profile={profile}
          onEdit={onEditMessage}
        />
      ))}
    </div>
  )
}
