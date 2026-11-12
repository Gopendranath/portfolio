import type { ReactNode } from 'react'
import { chatProfilesById } from '@/data/chat'
import type { ChatProfile, ChatProfileId } from '@/data/types'
import type {
  ChatThreadController,
  ViewMessage,
} from '@/lib/chat/use-chat-thread'
import { AiLockedPanel } from './ai-locked-panel'
import { AuthPanel } from './auth-panel'
import { ChatAvatar } from './chat-avatar'
import { ChatComposer } from './chat-composer'
import { ChatHeader } from './chat-header'
import { MessageList } from './message-list'

interface ChatThreadPanelProps {
  view: ChatProfileId
  isOwner: boolean
  signedIn: boolean
  sessionLoading: boolean
  sessionError: string | null
  aiEligible: boolean
  aiReason: string
  thread: ChatThreadController
  draft: string
  onDraftChange: (value: string) => void
  onSend: () => void
  onSignIn: () => Promise<void>
  onOpenOwner: () => void
}

function ChatThreadFrame({
  profile,
  children,
}: {
  profile: ChatProfile
  children: ReactNode
}) {
  return (
    <section
      id="chat-thread"
      aria-labelledby="chat-thread-title"
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <ChatHeader
        className="chat-thread-header hidden md:flex"
        titleId="chat-thread-title"
        title={profile.name}
        subtitle={profile.role}
        avatar={<ChatAvatar profile={profile} />}
      />
      {children}
    </section>
  )
}

function canEditMessage(
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

function handleEditMessage(
  view: ChatProfileId,
  thread: ChatThreadController,
  id: string,
  body: string,
) {
  if (view === 'assistant') {
    const index = thread.messages.findIndex((message) => message.id === id)
    const hasLater = thread.messages
      .slice(index + 1)
      .some((message) => message.status !== 'failed')

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

function ThreadError({ thread }: { thread: ChatThreadController }) {
  if (!thread.error) {
    return null
  }

  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 border-b border-line px-4 py-2 text-xs text-red-400"
    >
      <span>{thread.error}</span>
      <button
        type="button"
        onClick={() => {
          void thread.refetch()
        }}
        className="border border-line px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted"
      >
        Retry
      </button>
    </div>
  )
}

function SignedInThread({
  view,
  isOwner,
  thread,
  draft,
  onDraftChange,
  onSend,
}: {
  view: ChatProfileId
  isOwner: boolean
  thread: ChatThreadController
  draft: string
  onDraftChange: (value: string) => void
  onSend: () => void
}) {
  const profile = chatProfilesById[view]

  return (
    <>
      <ThreadError thread={thread} />
      <MessageList
        messages={thread.messages}
        profile={profile}
        hasMore={thread.hasMore}
        isFetchingOlder={thread.isFetchingOlder}
        isLoading={thread.isLoading}
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

export function ChatThreadPanel({
  view,
  isOwner,
  signedIn,
  sessionLoading,
  sessionError,
  aiEligible,
  aiReason,
  thread,
  draft,
  onDraftChange,
  onSend,
  onSignIn,
  onOpenOwner,
}: ChatThreadPanelProps) {
  const profile = chatProfilesById[view]
  const aiLocked = view === 'assistant' && !aiEligible

  if (!signedIn) {
    return (
      <ChatThreadFrame profile={profile}>
        <AuthPanel
          isLoading={sessionLoading}
          error={sessionError}
          onSignIn={onSignIn}
        />
      </ChatThreadFrame>
    )
  }

  if (aiLocked) {
    return (
      <ChatThreadFrame profile={profile}>
        <AiLockedPanel reason={aiReason} onOpenOwner={onOpenOwner} />
      </ChatThreadFrame>
    )
  }

  return (
    <ChatThreadFrame profile={profile}>
      <SignedInThread
        view={view}
        isOwner={isOwner}
        thread={thread}
        draft={draft}
        onDraftChange={onDraftChange}
        onSend={onSend}
      />
    </ChatThreadFrame>
  )
}
