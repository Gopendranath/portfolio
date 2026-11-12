import { ChatComposer } from '@/components/chat/chat-composer'
import { MessageList } from '@/components/chat/message-list'
import { chatProfilesById } from '@/data/chat'
import type { ChatProfileId } from '@/data/types'
import type { ChatThreadController } from '@/lib/chat/use-chat-thread'
import { canEditMessage, handleEditMessage } from './message-edit-policy'
import { ThreadError } from './thread-error'

export function SignedInThread({
  view,
  isOwner,
  thread,
  draft,
  notice,
  onDraftChange,
  onSend,
}: {
  view: ChatProfileId
  isOwner: boolean
  thread: ChatThreadController
  draft: string
  notice: string | null
  onDraftChange: (value: string) => void
  onSend: () => void
}) {
  const profile = chatProfilesById[view]

  return (
    <>
      <ThreadError thread={thread} />
      {notice ? (
        <p role="status" className="border-b border-line px-4 py-2 text-xs text-muted">
          {notice}
        </p>
      ) : null}
      <MessageList
        messages={thread.messages}
        profile={profile}
        hasMore={thread.hasMore}
        isFetchingOlder={thread.isFetchingOlder}
        isLoading={thread.isLoading}
        topInset={view === 'assistant'}
        canEditMessage={(message) => canEditMessage(message, view, isOwner)}
        onLoadOlder={thread.loadOlder}
        onEditMessage={(id, body) => handleEditMessage(view, thread, id, body)}
        onRetryMessage={(message) => {
          void thread.retry(message)
        }}
        onStop={thread.stop}
      />
      <ChatComposer
        profileName={profile.name}
        value={draft}
        onChange={onDraftChange}
        onSend={onSend}
        onStop={thread.stop}
        isSending={thread.isSending}
        isStreaming={thread.isStreaming}
      />
    </>
  )
}
