import type { FormEvent, KeyboardEvent } from 'react'
import { useLayoutEffect, useRef } from 'react'
import { ArrowRightIcon, StopIcon } from '@/components/ui/icons'
import { MAX_MESSAGE_LENGTH } from '@/lib/chat/protocol'

const MIN_COMPOSER_HEIGHT = 44
const MAX_COMPOSER_HEIGHT = 160

interface ChatComposerProps {
  profileName: string
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onStop?: () => void
  isSending?: boolean
  isStreaming?: boolean
  disabledReason?: string | null
}

export function ChatComposer({
  profileName,
  value,
  onChange,
  onSend,
  onStop,
  isSending = false,
  isStreaming = false,
  disabledReason = null,
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const length = Array.from(value).length
  const overLimit = length > MAX_MESSAGE_LENGTH
  const canSend =
    value.trim().length > 0 && !overLimit && !isSending && !isStreaming && !disabledReason
  const showCounter = length >= MAX_MESSAGE_LENGTH - 200

  // biome-ignore lint/correctness/useExhaustiveDependencies: the textarea height is derived from `value`, which is only read through the DOM node.
  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) {
      return
    }

    textarea.style.height = 'auto'
    const borderHeight = textarea.offsetHeight - textarea.clientHeight
    const contentHeight = textarea.scrollHeight + borderHeight
    const nextHeight = Math.min(contentHeight, MAX_COMPOSER_HEIGHT)

    textarea.style.height = `${Math.max(nextHeight, MIN_COMPOSER_HEIGHT)}px`
    textarea.style.overflowY = contentHeight > MAX_COMPOSER_HEIGHT ? 'auto' : 'hidden'
  }, [value])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (canSend) {
      onSend()
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) {
      return
    }

    event.preventDefault()
    if (canSend) {
      onSend()
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      toolname="send-chat-message"
      tooldescription={`Sends a message to ${profileName}. Messages are stored in the portfolio chat backend.`}
      className="border-t border-line p-3 sm:p-4"
    >
      <label htmlFor="chat-composer" className="sr-only">
        Message {profileName}
      </label>
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          id="chat-composer"
          name="message"
          rows={1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          toolparamdescription={`The message text addressed to ${profileName}.`}
          maxLength={MAX_MESSAGE_LENGTH}
          aria-describedby={showCounter ? 'chat-composer-count' : undefined}
          placeholder={disabledReason ?? `Message ${profileName}…`}
          disabled={Boolean(disabledReason) || isSending}
          className="min-h-11 max-h-40 flex-1 resize-none border border-line bg-canvas px-3 py-2.5 text-sm leading-relaxed text-ink transition-colors placeholder:text-muted focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />
        {isStreaming && onStop ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop response"
            className="inline-flex h-11 shrink-0 items-center gap-2 border border-line px-4 font-mono text-[10px] uppercase tracking-[0.16em] text-ink transition-colors hover:border-accent hover:text-accent"
          >
            Stop
            <StopIcon className="size-4" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send message"
            className="inline-flex h-11 shrink-0 items-center gap-2 bg-accent px-4 font-mono text-[10px] uppercase tracking-[0.16em] text-accent-ink transition-colors hover:bg-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send
            <ArrowRightIcon className="size-4" />
          </button>
        )}
      </div>
      <div className="mt-2 flex min-h-4 items-center justify-between gap-3 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
        <span>
          {disabledReason ??
            (isStreaming ? 'Streaming response…' : 'Enter sends · Shift+Enter newline')}
        </span>
        {showCounter ? (
          <span id="chat-composer-count" className={overLimit ? 'text-red-400' : undefined}>
            {length} / {MAX_MESSAGE_LENGTH}
          </span>
        ) : null}
      </div>
    </form>
  )
}
