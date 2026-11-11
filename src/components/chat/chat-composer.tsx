import type { FormEvent, KeyboardEvent } from 'react'
import { useLayoutEffect, useRef } from 'react'
import { ArrowRightIcon } from '@/components/ui/icons'

const MIN_COMPOSER_HEIGHT = 44
const MAX_COMPOSER_HEIGHT = 160

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
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const canSend = value.trim().length > 0

  // biome-ignore lint/correctness/useExhaustiveDependencies: the textarea height is derived from `value`, which is only read through the DOM node.
  useLayoutEffect(() => {
    const textarea = textareaRef.current

    if (!textarea) {
      return
    }

    const measure = () => {
      textarea.style.height = 'auto'
      const borderHeight = textarea.offsetHeight - textarea.clientHeight
      const contentHeight = textarea.scrollHeight + borderHeight
      const nextHeight = Math.min(contentHeight, MAX_COMPOSER_HEIGHT)

      textarea.style.height = `${Math.max(nextHeight, MIN_COMPOSER_HEIGHT)}px`
      textarea.style.overflowY =
        contentHeight > MAX_COMPOSER_HEIGHT ? 'auto' : 'hidden'
    }

    measure()
  }, [value])

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
    // Declarative WebMCP: the browser exposes this form as a tool agents can
    // fill. No `toolautosubmit`, so the user still presses Send themselves.
    <form
      onSubmit={handleSubmit}
      toolname="send-chat-message"
      tooldescription={`Writes a message into the ${profileName} chat preview. Messages stay on the page and are not sent to any backend.`}
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
          placeholder={`Message ${profileName}…`}
          className="min-h-11 max-h-40 flex-1 resize-none border border-line bg-canvas px-3 py-2.5 text-sm leading-relaxed text-ink transition-colors placeholder:text-muted focus:border-accent focus:outline-none"
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
