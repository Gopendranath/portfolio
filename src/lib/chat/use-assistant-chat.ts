import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { useAssistantConversations, useDeleteAssistantConversation } from './use-assistant-history'
import { useChatThread } from './use-chat-thread'

const HISTORY_QUERY_KEY = ['chat', 'assistant-conversations'] as const

type AssistantSelection = { type: 'auto' } | { type: 'new' } | { type: 'chat'; id: string }

export function useAssistantChat(input: { enabled: boolean; historyEnabled: boolean }) {
  const queryClient = useQueryClient()
  const [historyOpen, setHistoryOpen] = useState(false)
  const [selection, setSelection] = useState<AssistantSelection>({
    type: 'auto',
  })
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<string | null>(null)

  const historyQuery = useAssistantConversations(input.historyEnabled)
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
  const draftKey = activeConversationId ?? 'new'
  const draft = drafts[draftKey] ?? ''

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
        setDrafts((current) => ({ ...current, new: body }))
      }
      setSelection({ type: 'auto' })
      setNotice('This chat was deleted. Your message was not sent.')
      void queryClient.invalidateQueries({ queryKey: HISTORY_QUERY_KEY })
    },
    [queryClient],
  )

  const thread = useChatThread({
    kind: 'assistant',
    conversationId: activeConversationId,
    enabled: input.enabled,
    onConversationStarted: handleConversationStarted,
    onConversationLost: handleConversationLost,
  })

  const confirmSwitch = useCallback(() => {
    if (thread.isStreaming) {
      const confirmed = window.confirm(
        'Stop the response and switch chats? The partial reply will be saved.',
      )
      if (!confirmed) {
        return false
      }
      thread.stop()
    }

    thread.reset()
    return true
  }, [thread])

  const onSelect = useCallback(
    (conversationId: string) => {
      if (!confirmSwitch()) {
        return
      }
      setSelection({ type: 'chat', id: conversationId })
      setNotice(null)
      setHistoryOpen(false)
    },
    [confirmSwitch],
  )

  const onNew = useCallback(() => {
    if (!confirmSwitch()) {
      return
    }
    setSelection({ type: 'new' })
    setNotice(null)
    setHistoryOpen(false)
  }, [confirmSwitch])

  const onDelete = useCallback(
    async (conversationId: string) => {
      const deletingActive = conversationId === activeConversationId

      try {
        await deleteConversation(conversationId)
        if (deletingActive) {
          thread.stop()
          thread.reset()
          setSelection({ type: 'auto' })
          setNotice(null)
        }
      } catch {
        setNotice('Could not delete this chat.')
      }
    },
    [activeConversationId, deleteConversation, thread],
  )

  const onDraftChange = useCallback(
    (value: string) => {
      if (selection.type === 'auto' && !activeConversationId) {
        setSelection({ type: 'new' })
      }
      setDrafts((current) => ({ ...current, [draftKey]: value }))
    },
    [activeConversationId, draftKey, selection.type],
  )

  const onSend = useCallback(() => {
    setNotice(null)
    void thread.send(draft)
    setDrafts((current) => ({ ...current, [draftKey]: '' }))
  }, [draft, draftKey, thread])

  const historyError =
    historyQuery.error instanceof Error
      ? historyQuery.error.message
      : historyQuery.error
        ? 'Could not load chats'
        : null

  return {
    thread,
    draft,
    notice,
    historyOpen,
    conversations,
    activeConversationId,
    historyLoading: historyQuery.isLoading,
    historyError,
    hasMoreHistory: Boolean(historyQuery.hasNextPage),
    isFetchingMoreHistory: historyQuery.isFetchingNextPage,
    onDraftChange,
    onSend,
    onOpenHistory: () => setHistoryOpen(true),
    onCloseHistory: () => setHistoryOpen(false),
    onSelect,
    onNew,
    onDelete: (conversationId: string) => {
      void onDelete(conversationId)
    },
    onLoadMoreHistory: () => {
      void historyQuery.fetchNextPage()
    },
    onRetryHistory: () => {
      void historyQuery.refetch()
    },
  }
}
