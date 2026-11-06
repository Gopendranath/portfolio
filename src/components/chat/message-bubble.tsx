import { useEffect, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { ChatMessage, ChatProfile } from '../../data/types'
import { Tooltip, TooltipTrigger } from '../ui/tooltip'
import { ChatAvatar } from './chat-avatar'

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

type CopyStatus = 'idle' | 'copied' | 'failed'

interface MessageBubbleProps {
  message: ChatMessage
  profile: ChatProfile
  onEdit: (id: string, body: string) => void
}

function formatTime(timestamp: number) {
  return timeFormatter.format(timestamp)
}

export function MessageBubble({
  message,
  profile,
  onEdit,
}: MessageBubbleProps) {
  const isUser = message.author === 'user'
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(message.body)
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle')

  useEffect(() => {
    if (copyStatus === 'idle') {
      return
    }

    const timer = window.setTimeout(() => setCopyStatus('idle'), 1600)

    return () => window.clearTimeout(timer)
  }, [copyStatus])

  function startEditing() {
    setDraft(message.body)
    setIsEditing(true)
  }

  function cancelEditing() {
    setDraft(message.body)
    setIsEditing(false)
  }

  function saveEdit() {
    const body = draft.trim()

    if (!body) {
      return
    }

    if (body !== message.body) {
      onEdit(message.id, body)
    }

    setIsEditing(false)
  }

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message.body)
      setCopyStatus('copied')
    } catch {
      setCopyStatus('failed')
    }
  }

  function handleEditorKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      cancelEditing()
      return
    }

    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault()
      saveEdit()
    }
  }

  const copyLabel =
    copyStatus === 'copied'
      ? 'Copied'
      : copyStatus === 'failed'
        ? 'Copy failed'
        : 'Copy'

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
          isEditing ? 'w-full max-w-[85%] md:max-w-[36rem]' : 'max-w-[85%]'
        }`}
      >
        {isUser ? null : (
          <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
            {profile.name}
          </p>
        )}

        {isEditing ? (
          <div>
            <textarea
              autoFocus
              aria-label="Edit message"
              rows={3}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleEditorKeyDown}
              className="block max-h-40 w-full resize-none overflow-y-auto border border-accent bg-canvas px-3 py-2 text-sm leading-relaxed text-ink focus:outline-none"
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelEditing}
                className="border border-line px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted transition-colors hover:border-accent hover:text-accent"
              >
                Cancel edit
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={!draft.trim()}
                className="border border-accent bg-accent px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-accent-ink transition-colors hover:bg-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                Save edit
              </button>
            </div>
          </div>
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
          <span className="whitespace-nowrap">
            {message.editedAt !== undefined ? (
              <>
                edited{' '}
                <time dateTime={new Date(message.editedAt).toISOString()}>
                  {formatTime(message.editedAt)}
                </time>
              </>
            ) : (
              <time dateTime={new Date(message.sentAt).toISOString()}>
                {formatTime(message.sentAt)}
              </time>
            )}
          </span>

          {isEditing ? null : (
            <div className="flex items-center gap-1 opacity-100 transition-opacity md:pointer-events-none md:opacity-0 md:group-focus-within:pointer-events-auto md:group-focus-within:opacity-100 md:group-hover:pointer-events-auto md:group-hover:opacity-100">
              <Tooltip label="Copy message">
                <TooltipTrigger
                  type="button"
                  aria-label="Copy message"
                  onClick={copyMessage}
                  className="border border-line px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted transition-colors hover:border-accent hover:text-accent"
                >
                  {copyLabel}
                </TooltipTrigger>
              </Tooltip>
              {isUser ? (
                <Tooltip label="Edit message">
                  <TooltipTrigger
                    type="button"
                    aria-label="Edit message"
                    onClick={startEditing}
                    className="border border-line px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted transition-colors hover:border-accent hover:text-accent"
                  >
                    Edit
                  </TooltipTrigger>
                </Tooltip>
              ) : null}
            </div>
          )}

          <span className="sr-only" aria-live="polite">
            {copyStatus === 'copied'
              ? 'Message copied'
              : copyStatus === 'failed'
                ? 'Copy failed'
                : ''}
          </span>
        </div>
      </div>
    </article>
  )
}
