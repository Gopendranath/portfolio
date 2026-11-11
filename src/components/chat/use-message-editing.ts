import type { KeyboardEvent } from 'react'
import { useState } from 'react'
import type { ChatMessage } from '@/data/types'

interface UseMessageEditingOptions {
  message: ChatMessage
  onEdit: (id: string, body: string) => void
}

export function useMessageEditing({
  message,
  onEdit,
}: UseMessageEditingOptions) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(message.body)

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

  return {
    isEditing,
    draft,
    setDraft,
    startEditing,
    cancelEditing,
    saveEdit,
    handleEditorKeyDown,
  }
}
