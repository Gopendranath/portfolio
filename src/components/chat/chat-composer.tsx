import type { FormEvent, KeyboardEvent } from 'react'
import { ArrowRightIcon } from '../ui/icons'

interface ChatComposerProps {
  profileName: string
  value: string
  onChange: (value: string) => void
  onSend: () => void
}

export function ChatComposer({
  profileName,
  value,
  onChange,
  onSend,
}: ChatComposerProps) {
  const canSend = value.trim().length > 0

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (canSend) {
      onSend()
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key !== 'Enter' ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    ) {
      return
    }

    event.preventDefault()

    if (canSend) {
      onSend()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-line p-3 sm:p-4">
      <label htmlFor="chat-composer" className="sr-only">
        Message {profileName}
      </label>
      <div className="flex items-end gap-2">
        <textarea
          id="chat-composer"
          name="message"
          rows={1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${profileName}…`}
          className="min-h-11 flex-1 resize-none border border-line bg-canvas px-3 py-2.5 text-sm leading-relaxed text-ink transition-colors placeholder:text-muted focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send message"
          className="inline-flex h-11 shrink-0 items-center gap-2 bg-accent px-4 font-mono text-[10px] uppercase tracking-[0.16em] text-accent-ink transition-colors hover:bg-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
          <ArrowRightIcon className="size-4" />
        </button>
      </div>
    </form>
  )
}
