import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChatProfileId } from '@/data/types'
import { chatFetch } from '@/lib/chat/api-client'
import { useChatSession } from '@/lib/chat/session'
import {
  useAssistantConversations,
  useDeleteAssistantConversation,
} from '@/lib/chat/use-assistant-history'
import { useChatThread } from '@/lib/chat/use-chat-thread'
import { AssistantHistoryDialog } from './assistant-history-dialog'
import { ChatProfilePanel } from './chat-profile-panel'
import { ChatThreadPanel } from './chat-thread-panel'
import { OwnerInbox } from './owner-inbox'

type ChatView = ChatProfileId | 'inbox'
type AssistantSelection =
  | { type: 'auto' }
  | { type: 'new' }
  | { type: 'chat'; id: string }

const HISTORY_QUERY_KEY = ['chat', 'assistant-conversations'] as const

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
  const [historyOpen, setHistoryOpen] = useState(false)
  const [selection, setSelection] = useState<AssistantSelection>({
    type: 'auto',
  })
  const [ownerDraft, setOwnerDraft] = useState('')
  const [assistantDrafts, setAssistantDrafts] = useState<
    Record<string, string>
  >({})
  const [notice, setNotice] = useState<string | null>(null)

  const historyEnabled =
    activeView === 'assistant' && Boolean(session.token) && session.aiEligible
  const historyQuery = useAssistantConversations(historyEnabled)
  const deleteConversation = useDeleteAssistantConversation()
  const conversations = useMemo(
    () => historyQuery.data?.pages.flatMap((page) => page.conversations) ?? [],
    [historyQuery.data],
  )
  const activeConversationId =
    selection.type === 'auto'
      ? (conversations[0]?.id ?? null)
      : selection.type === 'chat'
        ? selection.id
        : null

  const handleConversationStarted = useCallback(
    (conversationId: string) => {
      setSelection({ type: 'chat', id: conversationId })
      setNotice(null)
      void queryClient.invalidateQueries({ queryKey: HISTORY_QUERY_KEY })
    },
    [queryClient],
  )
  const handleConversationLost = useCallback(
    (_conversationId: string, body: string) => {
      if (body) {
        setAssistantDrafts((current) => ({ ...current, new: body }))
      }
      setSelection({ type: 'auto' })
      setNotice('This chat was deleted. Your message was not sent.')
      void queryClient.invalidateQueries({ queryKey: HISTORY_QUERY_KEY })
    },
    [queryClient],
  )

  const assistantThread = useChatThread({
    kind: 'assistant',
    conversationId: activeConversationId,
    enabled: Boolean(session.token) && session.aiEligible,
    onConversationStarted: handleConversationStarted,
    onConversationLost: handleConversationLost,
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
  const draftKey = activeConversationId ?? 'new'
  const activeDraft =
    threadView === 'assistant' ? (assistantDrafts[draftKey] ?? '') : ownerDraft
  const historyError =
    historyQuery.error instanceof Error
      ? historyQuery.error.message
      : historyQuery.error
        ? 'Could not load chats'
        : null

  function confirmAssistantSwitch(): boolean {
    if (assistantThread.isStreaming) {
      const confirmed = window.confirm(
        'Stop the response and switch chats? The partial reply will be saved.',
      )
      if (!confirmed) {
        return false
      }
      assistantThread.stop()
    }

    assistantThread.reset()
    return true
  }

  function selectAssistantChat(conversationId: string) {
    if (!confirmAssistantSwitch()) {
      return
    }
    setSelection({ type: 'chat', id: conversationId })
    setNotice(null)
    setHistoryOpen(false)
  }

  function startNewAssistantChat() {
    if (!confirmAssistantSwitch()) {
      return
    }
    setSelection({ type: 'new' })
    setNotice(null)
    setHistoryOpen(false)
  }

  async function removeConversation(conversationId: string) {
    const deletingActive = conversationId === activeConversationId

    try {
      await deleteConversation(conversationId)
      if (deletingActive) {
        assistantThread.stop()
        assistantThread.reset()
        setSelection({ type: 'auto' })
        setNotice(null)
      }
    } catch {
      setNotice('Could not delete this chat.')
    }
  }

  function handleDraftChange(value: string) {
    if (threadView === 'assistant') {
      if (selection.type === 'auto' && !activeConversationId) {
        setSelection({ type: 'new' })
      }
      setAssistantDrafts((current) => ({ ...current, [draftKey]: value }))
    } else {
      setOwnerDraft(value)
    }
  }

  function handleSend() {
    setNotice(null)
    void activeThread.send(activeDraft)
    if (threadView === 'assistant') {
      setAssistantDrafts((current) => ({ ...current, [draftKey]: '' }))
    } else {
      setOwnerDraft('')
    }
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
        notice={threadView === 'assistant' ? notice : null}
        showHistory={threadView === 'assistant'}
        onDraftChange={handleDraftChange}
        onSend={handleSend}
        onSignIn={session.signIn}
        onOpenOwner={() => setActiveView('owner')}
        onOpenHistory={() => setHistoryOpen(true)}
      />

      <AssistantHistoryDialog
        open={historyOpen}
        conversations={conversations}
        activeId={activeConversationId}
        isLoading={historyQuery.isLoading}
        error={historyError}
        hasMore={Boolean(historyQuery.hasNextPage)}
        isFetchingMore={historyQuery.isFetchingNextPage}
        onClose={() => setHistoryOpen(false)}
        onNew={startNewAssistantChat}
        onSelect={selectAssistantChat}
        onDelete={(conversationId) => {
          void removeConversation(conversationId)
        }}
        onLoadMore={() => {
          void historyQuery.fetchNextPage()
        }}
        onRetry={() => {
          void historyQuery.refetch()
        }}
      />
    </section>
  )
}
