import type { ChatProfileId } from '@/data/types'
import type { ChatThreadController, ViewMessage } from '@/lib/chat/use-chat-thread'

export function canEditMessage(
  message: ViewMessage,
  view: ChatProfileId,
  isOwner: boolean,
): boolean {
  if (view === 'assistant') {
    return message.author === 'user'
  }
  if (isOwner) {
    return message.author === 'owner'
  }
  return message.author === 'user'
}

export function handleEditMessage(
  view: ChatProfileId,
  thread: ChatThreadController,
  id: string,
  body: string,
) {
  if (view === 'assistant') {
    const index = thread.messages.findIndex((message) => message.id === id)
    const hasLater = thread.messages.slice(index + 1).some((message) => message.status !== 'failed')

    if (hasLater) {
      const confirmed = window.confirm(
        'Editing this message will remove the later replies and generate a new answer.',
      )
      if (!confirmed) {
        return
      }
    }
  }

  void thread.edit(id, body)
}
