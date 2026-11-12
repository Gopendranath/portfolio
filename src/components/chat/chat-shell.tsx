import { useState } from 'react'
import type { ChatProfileId } from '@/data/types'
import { useChatSession } from '@/lib/chat/session'
import { useAssistantChat } from '@/lib/chat/use-assistant-chat'
import { useChatThread } from '@/lib/chat/use-chat-thread'
import { useOwnerReadReceipt } from '@/lib/chat/use-owner-read-receipt'
import { AssistantHistoryDialog } from './assistant-history-dialog'
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
  const [activeView, setActiveView] = useState<ChatView>('assistant')
  const [ownerDraft, setOwnerDraft] = useState('')

  const assistant = useAssistantChat({
    enabled: Boolean(session.token) && session.aiEligible,
    historyEnabled:
      activeView === 'assistant' &&
      Boolean(session.token) &&
      session.aiEligible,
  })
  const ownerThread = useChatThread({
    kind: 'owner',
    enabled: Boolean(session.token) && !session.isOwner,
    pollMs: 10_000,
  })

  useOwnerReadReceipt({
    active: activeView === 'owner',
    token: session.token,
    isOwner: session.isOwner,
    latestMessageId: ownerThread.messages.at(-1)?.id,
  })

  if (session.isLoading) {
    return <ChatLoading />
  }

  if (session.isOwner && activeView === 'inbox') {
    return <OwnerInbox onBack={() => setActiveView('assistant')} />
  }

  const isAssistant = activeView === 'assistant'
  const threadView: ChatProfileId = isAssistant ? 'assistant' : 'owner'
  const activeThread = isAssistant ? assistant.thread : ownerThread
  const activeDraft = isAssistant ? assistant.draft : ownerDraft

  function handleDraftChange(value: string) {
    if (isAssistant) {
      assistant.onDraftChange(value)
      return
    }
    setOwnerDraft(value)
  }

  function handleSend() {
    if (isAssistant) {
      assistant.onSend()
      return
    }
    void ownerThread.send(ownerDraft)
    setOwnerDraft('')
  }

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
        notice={isAssistant ? assistant.notice : null}
        showHistory={isAssistant}
        onDraftChange={handleDraftChange}
        onSend={handleSend}
        onSignIn={session.signIn}
        onOpenOwner={() => setActiveView('owner')}
        onOpenHistory={assistant.onOpenHistory}
      />

      <AssistantHistoryDialog
        open={assistant.historyOpen}
        conversations={assistant.conversations}
        activeId={assistant.activeConversationId}
        isLoading={assistant.historyLoading}
        error={assistant.historyError}
        hasMore={assistant.hasMoreHistory}
        isFetchingMore={assistant.isFetchingMoreHistory}
        onClose={assistant.onCloseHistory}
        onNew={assistant.onNew}
        onSelect={assistant.onSelect}
        onDelete={assistant.onDelete}
        onLoadMore={assistant.onLoadMoreHistory}
        onRetry={assistant.onRetryHistory}
      />
    </section>
  )
}
