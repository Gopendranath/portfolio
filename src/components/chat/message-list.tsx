import { useEffect, useRef } from 'react'
import type { ChatMessage, ChatProfile } from '../../data/types'
import { MessageBubble } from './message-bubble'

interface MessageListProps {
  messages: readonly ChatMessage[]
  profile: ChatProfile
}

export function MessageList({ messages, profile }: MessageListProps) {
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const log = logRef.current

    if (log) {
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
        <MessageBubble key={message.id} message={message} profile={profile} />
      ))}
    </div>
  )
}
