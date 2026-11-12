import { useState } from 'react'
import { chatProfiles, chatProfilesById } from '@/data/chat'
import type { ChatProfileId } from '@/data/types'
import { useChatSession } from '@/lib/chat/session'
import { useChatThread, type ViewMessage } from '@/lib/chat/use-chat-thread'
import { AiLockedPanel } from './ai-locked-panel'
import { AuthPanel } from './auth-panel'
import { ChatAvatar } from './chat-avatar'
import { ChatComposer } from './chat-composer'
import { MessageList } from './message-list'
import { OwnerInbox } from './owner-inbox'
import { ProfileList } from './profile-list'

type ChatView = ChatProfileId | 'inbox'

export function ChatShell() {
  const session = useChatSession()
  const [activeView, setActiveView] = useState<ChatView>('assistant')
  const [drafts, setDrafts] = useState<Record<ChatProfileId, string>>({
    assistant: '',
    owner: '',
  })
  const assistantThread = useChatThread({
    kind: 'assistant',
    enabled: Boolean(session.token) && session.aiEligible,
  })
  const ownerThread = useChatThread({
    kind: 'owner',
    enabled: Boolean(session.token) && !session.isOwner,
    pollMs: 10_000,
  })

  if (session.isLoading) {
    return (
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden md:grid md:grid-cols-[280px_minmax(0,1fr)]">
        <div className="border-b border-line p-4 md:border-b-0 md:border-r">
          <div className="h-8 w-24 animate-pulse bg-surface/60" />
          <div className="mt-6 space-y-2">
            <div className="h-14 animate-pulse border border-line bg-surface/40" />
            <div className="h-14 animate-pulse border border-line bg-surface/40" />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            Loading session…
          </p>
        </div>
      </section>
    )
  }

  const isOwner = session.isOwner
  const profiles = isOwner ? [chatProfilesById.assistant] : chatProfiles

  if (isOwner && activeView === 'inbox') {
    return <OwnerInbox onBack={() => setActiveView('assistant')} />
  }

  const threadView: ChatProfileId =
    activeView === 'assistant' ? 'assistant' : 'owner'
  const activeProfile = chatProfilesById[threadView]
  const activeThread =
    threadView === 'assistant' ? assistantThread : ownerThread
  const activeDraft = drafts[threadView]
  const aiLocked = threadView === 'assistant' && !session.aiEligible
  const signedIn = Boolean(session.token)

  function canEditMessage(message: ViewMessage): boolean {
    if (threadView === 'assistant') {
      return message.author === 'user'
    }
    if (isOwner) {
      return message.author === 'owner'
    }
    return message.author === 'user'
  }

  function handleEditMessage(id: string, body: string) {
    if (threadView === 'assistant') {
      const index = activeThread.messages.findIndex(
        (message) => message.id === id,
      )
      const hasLater = activeThread.messages
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

    void activeThread.edit(id, body)
  }

  return (
    <section
      aria-label="Chat"
      className="flex min-h-0 flex-1 flex-col overflow-hidden md:grid md:grid-cols-[280px_minmax(0,1fr)]"
    >
      <div className="chat-profile-panel flex shrink-0 flex-col border-b border-line p-4 md:border-b-0 md:border-r">
        <div className="chat-profile-heading shrink-0">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-accent">
            05 / Chat
          </p>
          <h1 className="mt-1 text-xl font-medium tracking-[-0.02em] text-ink">
            Chat.
          </h1>
        </div>

        <div className="chat-profile-list mt-4 space-y-2">
          <ProfileList
            profiles={profiles}
            activeProfileId={threadView}
            badges={
              !isOwner && session.ownerUnreadCount > 0
                ? { owner: session.ownerUnreadCount }
                : undefined
            }
            onSelect={setActiveView}
          />

          {isOwner ? (
            <button
              type="button"
              onClick={() => setActiveView('inbox')}
              className="flex w-full items-center gap-2.5 border border-transparent p-3 text-left transition-colors hover:border-line hover:bg-surface/40"
            >
              <span className="flex size-8 shrink-0 items-center justify-center border border-line bg-canvas font-mono text-[9px] uppercase tracking-[0.12em] text-accent">
                IN
              </span>
              <span>
                <span className="block text-[13px] font-medium leading-tight text-ink md:text-sm">
                  Inbox
                </span>
                <span className="mt-1 block font-mono text-[9px] uppercase leading-tight tracking-[0.14em] text-muted">
                  Owner messages
                </span>
              </span>
            </button>
          ) : null}
        </div>

        {signedIn ? (
          <div className="mt-auto hidden pt-4 md:block">
            <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
              {session.user?.githubLogin ?? 'Signed in'}
            </p>
            <button
              type="button"
              onClick={() => {
                void session.signOut()
              }}
              className="mt-2 border border-line px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted transition-colors hover:border-accent hover:text-accent"
            >
              Sign out
            </button>
          </div>
        ) : null}
      </div>

      <section
        id="chat-thread"
        aria-labelledby="chat-thread-title"
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <header className="chat-thread-header hidden shrink-0 items-center gap-3 border-b border-line p-4 md:flex">
          <ChatAvatar profile={activeProfile} />
          <div className="min-w-0">
            <h2
              id="chat-thread-title"
              className="truncate text-sm font-medium text-ink"
            >
              {activeProfile.name}
            </h2>
            <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
              {activeProfile.role}
            </p>
          </div>
          {signedIn ? (
            <button
              type="button"
              onClick={() => {
                void session.signOut()
              }}
              className="ml-auto border border-line px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted transition-colors hover:border-accent hover:text-accent md:hidden"
            >
              Sign out
            </button>
          ) : null}
        </header>

        {!signedIn ? (
          <AuthPanel
            isLoading={session.isLoading}
            error={session.error}
            onSignIn={session.signIn}
          />
        ) : aiLocked ? (
          <AiLockedPanel
            reason={session.aiReason}
            onOpenOwner={() => setActiveView('owner')}
          />
        ) : (
          <>
            {activeThread.error ? (
              <div
                role="alert"
                className="flex items-center justify-between gap-3 border-b border-line px-4 py-2 text-xs text-red-400"
              >
                <span>{activeThread.error}</span>
                <button
                  type="button"
                  onClick={() => {
                    void activeThread.refetch()
                  }}
                  className="border border-line px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted"
                >
                  Retry
                </button>
              </div>
            ) : null}

            <MessageList
              messages={activeThread.messages}
              profile={activeProfile}
              hasMore={activeThread.hasMore}
              isFetchingOlder={activeThread.isFetchingOlder}
              isLoading={activeThread.isLoading}
              canEditMessage={canEditMessage}
              onLoadOlder={activeThread.loadOlder}
              onEditMessage={handleEditMessage}
              onRetryMessage={(message) => {
                void activeThread.retry(message)
              }}
              onStop={activeThread.stop}
            />
            <ChatComposer
              profileName={activeProfile.name}
              value={activeDraft}
              onChange={(value) =>
                setDrafts((current) => ({ ...current, [threadView]: value }))
              }
              onSend={() => {
                void activeThread.send(activeDraft)
                setDrafts((current) => ({ ...current, [threadView]: '' }))
              }}
              onStop={activeThread.stop}
              isSending={activeThread.isSending}
              isStreaming={activeThread.isStreaming}
            />
          </>
        )}
      </section>
    </section>
  )
}
