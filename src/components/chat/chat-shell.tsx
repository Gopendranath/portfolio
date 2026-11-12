import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import type { ChatProfileId } from '@/data/types'
import { chatFetch } from '@/lib/chat/api-client'
import { useChatSession } from '@/lib/chat/session'
import { useChatThread } from '@/lib/chat/use-chat-thread'
import { ChatProfilePanel } from './chat-profile-panel'
import { ChatThreadPanel } from './chat-thread-panel'
import { OwnerInbox } from './owner-inbox'

type ChatView = ChatProfileId | 'inbox'

function ChatLoading() {
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

export function ChatShell() {
  const session = useChatSession()
  const queryClient = useQueryClient()
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
  const latestOwnerMessageId = ownerThread.messages.at(-1)?.id

  useEffect(() => {
    if (
      activeView !== 'owner' ||
      !session.token ||
      session.isOwner ||
      !latestOwnerMessageId
    ) {
      return
    }

    void chatFetch('/api/conversations/owner/read', { method: 'POST' })
      .then(() => queryClient.invalidateQueries({ queryKey: ['chat', 'me'] }))
      .catch(() => {})
  }, [
    activeView,
    latestOwnerMessageId,
    queryClient,
    session.isOwner,
    session.token,
  ])

  if (session.isLoading) {
    return <ChatLoading />
  }

  if (session.isOwner && activeView === 'inbox') {
    return <OwnerInbox onBack={() => setActiveView('assistant')} />
  }

  const threadView: ChatProfileId =
    activeView === 'assistant' ? 'assistant' : 'owner'
  const activeThread =
    threadView === 'assistant' ? assistantThread : ownerThread
  const activeDraft = drafts[threadView]

  return (
    <section
      aria-label="Chat"
      className="flex min-h-0 flex-1 flex-col overflow-hidden md:grid md:grid-cols-[280px_minmax(0,1fr)]"
    >
      <ChatProfilePanel
        isOwner={session.isOwner}
        signedIn={Boolean(session.token)}
        activeView={threadView}
        ownerUnreadCount={session.ownerUnreadCount}
        githubLogin={session.user?.githubLogin ?? null}
        onSelect={setActiveView}
        onOpenInbox={() => setActiveView('inbox')}
        onSignOut={() => {
          void session.signOut()
        }}
      />

      <ChatThreadPanel
        view={threadView}
        isOwner={session.isOwner}
        signedIn={Boolean(session.token)}
        sessionLoading={session.isLoading}
        sessionError={session.error}
        aiEligible={session.aiEligible}
        aiReason={session.aiReason}
        thread={activeThread}
        draft={activeDraft}
        onDraftChange={(value) =>
          setDrafts((current) => ({ ...current, [threadView]: value }))
        }
        onSend={() => {
          void activeThread.send(activeDraft)
          setDrafts((current) => ({ ...current, [threadView]: '' }))
        }}
        onSignIn={session.signIn}
        onOpenOwner={() => setActiveView('owner')}
      />
    </section>
  )
}
