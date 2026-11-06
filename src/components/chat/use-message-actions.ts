import { useEffect, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { ChatMessage } from '../../data/types'

type CopyStatus = 'idle' | 'copied' | 'failed'

export function useCopyFeedback(body: string) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle')

  useEffect(() => {
    if (copyStatus === 'idle') {
      return
    }

    const timer = window.setTimeout(() => setCopyStatus('idle'), 1600)

    return () => window.clearTimeout(timer)
  }, [copyStatus])

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(body)
      setCopyStatus('copied')
    } catch {
      setCopyStatus('failed')
    }
  }

  const copyLabel =
    copyStatus === 'copied'
      ? 'Copied'
      : copyStatus === 'failed'
        ? 'Copy failed'
        : 'Copy'

  const copyAnnouncement =
    copyStatus === 'copied'
      ? 'Message copied'
      : copyStatus === 'failed'
        ? 'Copy failed'
        : ''

  return { copyLabel, copyAnnouncement, copyMessage }
}

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
