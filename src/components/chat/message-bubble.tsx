import type { ChatMessage, ChatProfile } from '../../data/types'
import { ChatAvatar } from './chat-avatar'
import { MessageActions } from './message-actions'
import { MessageEditor } from './message-editor'
import { MessageTimestamp } from './message-timestamp'
import { useCopyFeedback, useMessageEditing } from './use-message-actions'

interface MessageBubbleProps {
  message: ChatMessage
  profile: ChatProfile
  onEdit: (id: string, body: string) => void
}

export function MessageBubble({
  message,
  profile,
  onEdit,
}: MessageBubbleProps) {
  const isUser = message.author === 'user'
  const { copyLabel, copyAnnouncement, copyMessage } = useCopyFeedback(
    message.body,
  )
  const editor = useMessageEditing({ message, onEdit })

  return (
    <article
      aria-label={`${isUser ? 'You' : profile.name}: ${message.body}`}
      className={`group flex items-end gap-2.5 ${
        isUser ? 'justify-end' : ''
      }`}
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
            {message.body}
          </p>
        )}

        <div
          className={`mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[9px] tracking-[0.12em] text-muted ${
            isUser ? 'justify-end' : ''
          }`}
        >
          <MessageTimestamp message={message} />

          {editor.isEditing ? null : (
            <MessageActions
              canEdit={isUser}
              copyLabel={copyLabel}
              onCopy={copyMessage}
              onEdit={editor.startEditing}
            />
          )}

          <span className="sr-only" aria-live="polite">
            {copyAnnouncement}
          </span>
        </div>
      </div>
    </article>
  )
}
