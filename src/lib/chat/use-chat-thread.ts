import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useRef, useState } from 'react'
import {
  ChatApiError,
  chatFetch,
  type StreamHandlers,
  streamChat,
} from './api-client'
import type { ChatKind, ChatMessageDTO, MessagePage } from './protocol'
import { MAX_MESSAGE_LENGTH } from './protocol'

export interface ViewMessage extends Omit<ChatMessageDTO, 'status'> {
  status: ChatMessageDTO['status'] | 'sending'
  errorMessage?: string
}

interface UseChatThreadOptions {
  kind: ChatKind
  ownerThreadUserId?: string
  conversationId?: string | null
  enabled: boolean
  pollMs?: number
  onConversationStarted?: (conversationId: string) => void
  onConversationLost?: (conversationId: string, body: string) => void
}

export interface ChatThreadController {
  messages: ViewMessage[]
  isLoading: boolean
  error: string | null
  hasMore: boolean
  isFetchingOlder: boolean
  isSending: boolean
  isStreaming: boolean
  loadOlder: () => Promise<void>
  send: (body: string) => Promise<void>
  stop: () => void
  reset: () => void
  retry: (message: ViewMessage) => Promise<void>
  edit: (messageId: string, body: string) => Promise<void>
  refetch: () => Promise<void>
}

function toViewMessage(message: ChatMessageDTO): ViewMessage {
  return { ...message }
}

function optimisticMessage(clientId: string, body: string): ViewMessage {
  return {
    id: `pending-${clientId}`,
    seq: Number.MAX_SAFE_INTEGER,
    conversationId: '',
    author: 'user',
    body,
    status: 'sending',
    clientId,
    sentAt: new Date().toISOString(),
    editedAt: null,
    errorCode: null,
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof ChatApiError) {
    return error.message
  }
  return error instanceof Error ? error.message : 'Something went wrong'
}

export function useChatThread({
  kind,
  ownerThreadUserId,
  conversationId,
  enabled,
  pollMs,
  onConversationStarted,
  onConversationLost,
}: UseChatThreadOptions): ChatThreadController {
  const queryClient = useQueryClient()
  const [pending, setPending] = useState<ViewMessage[]>([])
  const [streaming, setStreaming] = useState<ViewMessage | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [forkedAtSeq, setForkedAtSeq] = useState<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const isOwnerInbox = Boolean(ownerThreadUserId)
  const assistantConversationId =
    kind === 'assistant' && !isOwnerInbox ? (conversationId ?? null) : null
  const path = isOwnerInbox
    ? `/api/owner/threads/${ownerThreadUserId}/messages`
    : `/api/conversations/${kind}/messages`
  const queryKey = useMemo(
    () =>
      [
        'chat',
        'messages',
        kind,
        ownerThreadUserId ??
          (kind === 'assistant' ? (conversationId ?? 'draft') : 'me'),
      ] as const,
    [conversationId, kind, ownerThreadUserId],
  )

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '10' })
      if (pageParam !== undefined) {
        params.set('before', String(pageParam))
      }
      if (assistantConversationId) {
        params.set('conversationId', assistantConversationId)
      }
      return chatFetch<MessagePage>(`${path}?${params.toString()}`)
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled:
      enabled && (kind === 'owner' || isOwnerInbox || Boolean(conversationId)),
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchInterval: pollMs ?? false,
    retry: false,
  })

  const persisted = useMemo(
    () =>
      query.data
        ? [...query.data.pages].reverse().flatMap((page) => page.messages)
        : [],
    [query.data],
  )
  const persistedClientIds = useMemo(
    () =>
      new Set(
        persisted
          .map((message) => message.clientId)
          .filter((clientId): clientId is string => Boolean(clientId)),
      ),
    [persisted],
  )
  const pendingMessages = useMemo(
    () =>
      pending.filter(
        (message) =>
          (!message.clientId || !persistedClientIds.has(message.clientId)) &&
          (forkedAtSeq === null || message.seq <= forkedAtSeq),
      ),
    [pending, persistedClientIds, forkedAtSeq],
  )
  const messages: ViewMessage[] = useMemo(
    () => [
      ...persisted
        .map(toViewMessage)
        .filter(
          (message) =>
            (forkedAtSeq === null || message.seq <= forkedAtSeq) &&
            message.id !== streaming?.id,
        ),
      ...pendingMessages,
      ...(streaming ? [streaming] : []),
    ],
    [persisted, pendingMessages, streaming, forkedAtSeq],
  )

  const refetch = useCallback(async () => {
    await query.refetch()
  }, [query])

  const runStream = useCallback(
    async (
      streamPath: string,
      body: unknown,
      clientId: string,
      userMessage: ViewMessage,
      existingAssistantId?: string,
    ) => {
      const controller = new AbortController()
      abortRef.current = controller
      setIsStreaming(true)
      setStreaming({
        id: existingAssistantId ?? 'streaming-assistant',
        seq: Number.MAX_SAFE_INTEGER + 1,
        conversationId: userMessage.conversationId,
        author: 'assistant',
        body: '',
        status: 'streaming',
        clientId: null,
        sentAt: new Date().toISOString(),
        editedAt: null,
        errorCode: null,
      })

      let receivedMeta = false
      const handlers: StreamHandlers = {
        onMeta: (meta) => {
          receivedMeta = true
          if (kind === 'assistant' && !conversationId) {
            onConversationStarted?.(meta.conversationId)
          }
          setPending((current) =>
            current.map((message) =>
              message.clientId === clientId
                ? {
                    ...message,
                    id: meta.userMessageId,
                    conversationId: meta.conversationId,
                    status: 'complete',
                  }
                : message,
            ),
          )
          setStreaming((current) =>
            current
              ? {
                  ...current,
                  id: meta.assistantMessageId,
                  conversationId: meta.conversationId,
                }
              : current,
          )
        },
        onDelta: (text) => {
          setStreaming((current) =>
            current ? { ...current, body: current.body + text } : current,
          )
        },
        onDone: () => {
          setStreaming(null)
          setPending([])
          setIsStreaming(false)
          void queryClient.invalidateQueries({
            queryKey,
          })
        },
        onError: (error) => {
          if (
            error.code === 'NOT_FOUND' &&
            kind === 'assistant' &&
            conversationId
          ) {
            onConversationLost?.(conversationId, userMessage.body)
            setStreaming(null)
            setPending([])
            setIsStreaming(false)
            return
          }
          setStreaming((current) =>
            current
              ? {
                  ...current,
                  status: 'failed',
                  errorCode: error.code,
                  errorMessage: error.message,
                }
              : current,
          )
          setPending((current) =>
            current.map((message) =>
              message.clientId === clientId
                ? {
                    ...message,
                    status: 'failed',
                    errorMessage: error.message,
                  }
                : message,
            ),
          )
          setIsStreaming(false)
          if (receivedMeta || error.code === 'DUPLICATE') {
            setStreaming(null)
            setPending([])
            void queryClient.invalidateQueries({
              queryKey,
            })
          }
        },
      }

      try {
        await streamChat(streamPath, body, handlers, controller.signal)
      } catch (error) {
        if (controller.signal.aborted) {
          setStreaming((current) =>
            current
              ? {
                  ...current,
                  status: 'failed',
                  errorCode: 'ABORTED',
                  errorMessage: 'The response was stopped.',
                }
              : current,
          )
        } else {
          setStreaming((current) =>
            current
              ? {
                  ...current,
                  status: 'failed',
                  errorCode: 'UPSTREAM_ERROR',
                  errorMessage: errorMessage(error),
                }
              : current,
          )
        }
        setIsStreaming(false)
        if (receivedMeta) {
          setStreaming(null)
          setPending([])
          void queryClient.invalidateQueries({
            queryKey,
          })
        }
      } finally {
        abortRef.current = null
      }
    },
    [
      conversationId,
      kind,
      onConversationLost,
      onConversationStarted,
      queryClient,
      queryKey,
    ],
  )

  const send = useCallback(
    async (body: string) => {
      const trimmed = body.trim()
      if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH) {
        return
      }

      const clientId = crypto.randomUUID()
      const optimistic = optimisticMessage(clientId, trimmed)
      setPending((current) => [...current, optimistic])

      if (kind === 'assistant' && !isOwnerInbox) {
        await runStream(
          '/api/chat/assistant',
          {
            body: trimmed,
            clientId,
            conversationId: conversationId ?? null,
          },
          clientId,
          optimistic,
        )
        return
      }

      setIsSending(true)
      try {
        await chatFetch(
          isOwnerInbox
            ? `/api/owner/threads/${ownerThreadUserId}/messages`
            : '/api/chat/owner',
          {
            method: 'POST',
            body: JSON.stringify({ body: trimmed, clientId }),
          },
        )
        setPending((current) =>
          current.filter((message) => message.clientId !== clientId),
        )
        await query.refetch()
      } catch (error) {
        setPending((current) =>
          current.map((message) =>
            message.clientId === clientId
              ? {
                  ...message,
                  status: 'failed',
                  errorMessage: errorMessage(error),
                }
              : message,
          ),
        )
      } finally {
        setIsSending(false)
      }
    },
    [conversationId, isOwnerInbox, kind, ownerThreadUserId, query, runStream],
  )

  const retry = useCallback(
    async (message: ViewMessage) => {
      if (
        message.author === 'user' &&
        kind === 'assistant' &&
        !isOwnerInbox &&
        message.clientId
      ) {
        setIsSending(true)
        try {
          await runStream(
            '/api/chat/assistant',
            { body: message.body, clientId: message.clientId },
            message.clientId,
            message,
          )
        } finally {
          setIsSending(false)
        }
        return
      }

      if (message.author === 'assistant' && kind === 'assistant') {
        await runStream(
          '/api/chat/assistant/retry',
          { assistantMessageId: message.id },
          message.clientId ?? message.id,
          message,
          message.id,
        )
        return
      }

      if (!message.clientId) {
        return
      }

      setPending((current) =>
        current.map((item) =>
          item.id === message.id
            ? { ...item, status: 'sending', errorMessage: undefined }
            : item,
        ),
      )
      setIsSending(true)
      try {
        await chatFetch(
          isOwnerInbox
            ? `/api/owner/threads/${ownerThreadUserId}/messages`
            : '/api/chat/owner/retry',
          {
            method: 'POST',
            body: JSON.stringify({
              body: message.body,
              clientId: message.clientId,
            }),
          },
        )
        setPending((current) =>
          current.filter((item) => item.id !== message.id),
        )
        await query.refetch()
      } catch (error) {
        setPending((current) =>
          current.map((item) =>
            item.id === message.id
              ? {
                  ...item,
                  status: 'failed',
                  errorMessage: errorMessage(error),
                }
              : item,
          ),
        )
      } finally {
        setIsSending(false)
      }
    },
    [isOwnerInbox, kind, ownerThreadUserId, query, runStream],
  )

  const edit = useCallback(
    async (messageId: string, body: string) => {
      const trimmed = body.trim()
      if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH) {
        return
      }

      if (kind === 'assistant' && !isOwnerInbox) {
        const target = messages.find((message) => message.id === messageId)
        const controller = new AbortController()
        abortRef.current = controller
        setIsStreaming(true)
        setForkedAtSeq(target?.seq ?? null)
        setStreaming({
          id: 'streaming-edit',
          seq: Number.MAX_SAFE_INTEGER + 1,
          conversationId: '',
          author: 'assistant',
          body: '',
          status: 'streaming',
          clientId: null,
          sentAt: new Date().toISOString(),
          editedAt: null,
          errorCode: null,
        })

        try {
          await streamChat(
            '/api/chat/assistant/edit',
            { messageId, body: trimmed },
            {
              onMeta: (meta) => {
                setStreaming((current) =>
                  current
                    ? { ...current, id: meta.assistantMessageId }
                    : current,
                )
              },
              onDelta: (text) => {
                setStreaming((current) =>
                  current ? { ...current, body: current.body + text } : current,
                )
              },
              onDone: () => {
                setStreaming(null)
              },
              onError: (error) => {
                setStreaming((current) =>
                  current
                    ? {
                        ...current,
                        status: 'failed',
                        errorCode: error.code,
                        errorMessage: error.message,
                      }
                    : current,
                )
              },
            },
            controller.signal,
          )
        } catch (error) {
          setStreaming((current) =>
            current
              ? {
                  ...current,
                  status: 'failed',
                  errorCode: controller.signal.aborted
                    ? 'ABORTED'
                    : 'UPSTREAM_ERROR',
                  errorMessage: controller.signal.aborted
                    ? 'The response was stopped.'
                    : errorMessage(error),
                }
              : current,
          )
        } finally {
          abortRef.current = null
          setIsStreaming(false)
          await query.refetch()
          setForkedAtSeq(null)
          setStreaming(null)
        }
        return
      }

      await chatFetch(`/api/messages/${messageId}`, {
        method: 'PATCH',
        body: JSON.stringify({ body: trimmed }),
      })
      await query.refetch()
    },
    [isOwnerInbox, kind, messages, query],
  )

  const stop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setPending([])
    setStreaming(null)
    setIsSending(false)
    setIsStreaming(false)
    setForkedAtSeq(null)
  }, [])

  return {
    messages,
    isLoading: query.isLoading,
    error:
      query.error instanceof Error
        ? query.error.message
        : query.error
          ? 'Could not load messages'
          : null,
    hasMore: query.hasNextPage,
    isFetchingOlder: query.isFetchingNextPage,
    isSending,
    isStreaming,
    loadOlder: async () => {
      await query.fetchNextPage()
    },
    send,
    stop,
    reset,
    retry,
    edit,
    refetch,
  }
}
