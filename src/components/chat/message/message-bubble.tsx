import { useEffect, useRef } from 'react'
import { ChatAvatar } from '@/components/chat/chat-avatar'
import type { ChatMessage, ChatProfile } from '@/data/types'
import type { ViewMessage } from '@/lib/chat/use-chat-thread'
import { MessageBody } from './message-body'
import { MessageMeta } from './message-meta'
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
