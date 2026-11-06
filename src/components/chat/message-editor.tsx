import { useEffect, useRef } from 'react'
import type { KeyboardEvent } from 'react'

interface MessageEditorProps {
  draft: string
  onChange: (value: string) => void
  onCancel: () => void
  onSave: () => void
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void
}

export function MessageEditor({
  draft,
  onChange,
  onCancel,
  onSave,
  onKeyDown,
}: MessageEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  return (
    <div>
      <textarea
        ref={textareaRef}
        aria-label="Edit message"
        rows={3}
        value={draft}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        className="block max-h-40 w-full resize-none overflow-y-auto border border-accent bg-canvas px-3 py-2 text-sm leading-relaxed text-ink focus:outline-none"
      />
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="border border-line px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted transition-colors hover:border-accent hover:text-accent"
        >
          Cancel edit
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!draft.trim()}
          className="border border-accent bg-accent px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-accent-ink transition-colors hover:bg-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save edit
        </button>
      </div>
    </div>
  )
}
