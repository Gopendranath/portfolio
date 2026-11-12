import { useEffect, useState } from 'react'
import { chatProfilesById } from '@/data/chat'
import type { OwnerThreadDTO } from '@/lib/chat/protocol'
import { useChatThread } from '@/lib/chat/use-chat-thread'
import { useMarkOwnerThreadRead, useMarkOwnerThreadUnread } from '@/lib/chat/use-owner-inbox'
import { ChatAvatar } from './chat-avatar'
import { ChatComposer } from './chat-composer'
import { ChatHeader } from './chat-header'
import { MessageList } from './message-list'

interface OwnerThreadViewProps {
  thread: OwnerThreadDTO
  onBack: () => void
  onMarkedUnread: () => void
}

export function OwnerThreadView({
  thread: selected,
  onBack,
  onMarkedUnread,
}: OwnerThreadViewProps) {
  const markRead = useMarkOwnerThreadRead()
  const markUnread = useMarkOwnerThreadUnread()
  const thread = useChatThread({
    kind: 'owner',
    ownerThreadUserId: selected.userId,
    enabled: true,
    pollMs: 10_000,
  })
  const [draft, setDraft] = useState('')
  const [isMarkingUnread, setIsMarkingUnread] = useState(false)
  const latestMessageId = thread.messages.at(-1)?.id

  useEffect(() => {
    if (latestMessageId) {
      void markRead(selected.userId)
    }
  }, [latestMessageId, markRead, selected.userId])

  async function handleMarkUnread() {
    if (isMarkingUnread) {
      return
    }

    setIsMarkingUnread(true)
    const succeeded = await markUnread(selected.userId).then(
      () => true,
      () => false,
    )
    setIsMarkingUnread(false)

    if (succeeded) {
      onMarkedUnread()
    }
  }

  return (
    <section
      aria-label="Owner inbox thread"
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <ChatHeader
        className="flex"
        title={selected.githubLogin ?? 'GitHub user'}
        subtitle="Owner inbox"
        avatar={
          <ChatAvatar
            profile={chatProfilesById.owner}
            label={selected.githubLogin ?? 'Visitor'}
            size="sm"
          />
        }
        onBack={onBack}
        backLabel="Back to inbox"
        actions={
          <button
            type="button"
            onClick={() => {
              void handleMarkUnread()
            }}
            disabled={isMarkingUnread}
            className="border border-line px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted transition-colors hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-50"
          >
            Mark unread
          </button>
        }
      />

      <MessageList
        messages={thread.messages}
        profile={chatProfilesById.owner}
        ownAuthor="owner"
        incomingLabel={selected.githubLogin ?? 'Visitor'}
        hasMore={thread.hasMore}
        isFetchingOlder={thread.isFetchingOlder}
        isLoading={thread.isLoading}
        canEditMessage={(message) => message.author === 'owner'}
        onLoadOlder={thread.loadOlder}
        onEditMessage={thread.edit}
        onRetryMessage={thread.retry}
        onStop={thread.stop}
      />
      <ChatComposer
        profileName={selected.githubLogin ?? 'visitor'}
        value={draft}
        onChange={setDraft}
        onSend={() => {
          void thread.send(draft)
          setDraft('')
        }}
        onStop={thread.stop}
        isSending={thread.isSending}
        isStreaming={thread.isStreaming}
      />
    </section>
  )
}
