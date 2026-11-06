import type { ChatMessage, ChatProfile } from '../../data/types'
import { ChatAvatar } from './chat-avatar'

interface MessageBubbleProps {
  message: ChatMessage
  profile: ChatProfile
}

export function MessageBubble({ message, profile }: MessageBubbleProps) {
  const isUser = message.author === 'user'

  return (
    <article
      aria-label={`${isUser ? 'You' : profile.name}: ${message.body}`}
      className={`flex items-end gap-2.5 ${isUser ? 'justify-end' : ''}`}
    >
      {isUser ? null : <ChatAvatar profile={profile} size="sm" />}
      <div className="max-w-[85%] min-w-0">
        {isUser ? null : (
          <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
            {profile.name}
          </p>
        )}
        <p
          className={`whitespace-pre-wrap break-words border px-3.5 py-2.5 text-sm leading-relaxed ${
            isUser
              ? 'border-accent bg-accent text-accent-ink'
              : 'border-line bg-surface/70 text-ink'
          }`}
        >
          {message.body}
        </p>
      </div>
    </article>
  )
}
