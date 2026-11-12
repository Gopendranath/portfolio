import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { chatFetch, streamChat } from '@/lib/chat/api-client'
import { useAssistantConversations } from '@/lib/chat/use-assistant-history'
import { useChatThread } from '@/lib/chat/use-chat-thread'

vi.mock('@/lib/chat/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/chat/api-client')>()
  return {
    ...actual,
    chatFetch: vi.fn(),
    streamChat: vi.fn(),
  }
})

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function wrapperFor(client: QueryClient) {
  // biome-ignore lint/correctness/noComponentHookFactories: renderHook needs a per-test QueryClient wrapper.
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

const emptyPage = { messages: [], hasMore: false, nextCursor: null }

beforeEach(() => {
  vi.mocked(chatFetch).mockReset()
  vi.mocked(streamChat).mockReset()
  vi.mocked(chatFetch).mockResolvedValue(emptyPage)
})

describe('useChatThread conversation scope', () => {
  it('loads messages for the selected conversation', async () => {
    const client = createClient()
    renderHook(
      () =>
        useChatThread({
          kind: 'assistant',
          conversationId: '6f1c5a8e-3f7e-4c1e-9a0e-2d4b6c8d0e2f',
          enabled: true,
        }),
      { wrapper: wrapperFor(client) },
    )

    await waitFor(() => {
      expect(chatFetch).toHaveBeenCalledWith(
        '/api/conversations/assistant/messages?limit=10&conversationId=6f1c5a8e-3f7e-4c1e-9a0e-2d4b6c8d0e2f',
      )
    })
  })

  it('does not fetch while the selection is a draft', async () => {
    const client = createClient()
    renderHook(
      () =>
        useChatThread({
          kind: 'assistant',
          conversationId: null,
          enabled: true,
        }),
      { wrapper: wrapperFor(client) },
    )

    await Promise.resolve()
    expect(chatFetch).not.toHaveBeenCalled()
  })

  it('includes the conversation id when sending to an existing chat', async () => {
    vi.mocked(streamChat).mockImplementation(async (_path, _body, handlers) => {
      handlers.onMeta?.({
        conversationId: 'c1',
        userMessageId: 'u1',
        assistantMessageId: 'a1',
      })
      handlers.onDone?.({
        assistantMessageId: 'a1',
        finishReason: 'stop',
        truncated: false,
        outputTokens: 1,
      })
    })
    const client = createClient()
    const conversationId = '6f1c5a8e-3f7e-4c1e-9a0e-2d4b6c8d0e2f'
    const { result } = renderHook(
      () =>
        useChatThread({
          kind: 'assistant',
          conversationId,
          enabled: true,
        }),
      { wrapper: wrapperFor(client) },
    )

    await act(async () => {
      await result.current.send('hello')
    })

    expect(streamChat).toHaveBeenCalledWith(
      '/api/chat/assistant',
      expect.objectContaining({ body: 'hello', conversationId }),
      expect.anything(),
      expect.anything(),
    )
  })

  it('reports the new conversation id from meta on a draft send', async () => {
    vi.mocked(streamChat).mockImplementation(async (_path, _body, handlers) => {
      handlers.onMeta?.({
        conversationId: 'c-new',
        userMessageId: 'u1',
        assistantMessageId: 'a1',
      })
      handlers.onDone?.({
        assistantMessageId: 'a1',
        finishReason: 'stop',
        truncated: false,
        outputTokens: 1,
      })
    })
    const client = createClient()
    const onConversationStarted = vi.fn()
    const { result } = renderHook(
      () =>
        useChatThread({
          kind: 'assistant',
          conversationId: null,
          enabled: true,
          onConversationStarted,
        }),
      { wrapper: wrapperFor(client) },
    )

    await act(async () => {
      await result.current.send('hello')
    })

    expect(onConversationStarted).toHaveBeenCalledWith('c-new')
    expect(streamChat).toHaveBeenCalledWith(
      '/api/chat/assistant',
      { body: 'hello', clientId: expect.any(String), conversationId: null },
      expect.anything(),
      expect.anything(),
    )
  })

  it('refreshes the created conversation after a draft stream completes', async () => {
    vi.mocked(streamChat).mockImplementation(async (_path, _body, handlers) => {
      handlers.onMeta?.({
        conversationId: 'c-new',
        userMessageId: 'u1',
        assistantMessageId: 'a1',
      })
      handlers.onDone?.({
        assistantMessageId: 'a1',
        finishReason: 'stop',
        truncated: false,
        outputTokens: 1,
      })
    })
    const client = createClient()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(
      () =>
        useChatThread({
          kind: 'assistant',
          conversationId: null,
          enabled: true,
        }),
      { wrapper: wrapperFor(client) },
    )

    await act(async () => {
      await result.current.send('hello')
    })

    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: ['chat', 'messages', 'assistant', 'c-new'],
      })
    })
  })

  it('reports a lost conversation on NOT_FOUND', async () => {
    vi.mocked(streamChat).mockImplementation(async (_path, _body, handlers) => {
      handlers.onError?.({
        code: 'NOT_FOUND',
        message: 'Conversation not found',
        retryable: false,
      })
    })
    const client = createClient()
    const onConversationLost = vi.fn()
    const conversationId = '6f1c5a8e-3f7e-4c1e-9a0e-2d4b6c8d0e2f'
    const { result } = renderHook(
      () =>
        useChatThread({
          kind: 'assistant',
          conversationId,
          enabled: true,
          onConversationLost,
        }),
      { wrapper: wrapperFor(client) },
    )

    await act(async () => {
      await result.current.send('keep this text')
    })

    expect(onConversationLost).toHaveBeenCalledWith(
      conversationId,
      'keep this text',
    )
  })

  it('clears pending and streaming state on reset', async () => {
    let release: (() => void) | undefined
    vi.mocked(streamChat).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          release = resolve
        }),
    )
    const client = createClient()
    const { result } = renderHook(
      () =>
        useChatThread({
          kind: 'assistant',
          conversationId: null,
          enabled: true,
        }),
      { wrapper: wrapperFor(client) },
    )

    act(() => {
      void result.current.send('hello')
    })

    await waitFor(() => {
      expect(result.current.isStreaming).toBe(true)
    })

    act(() => {
      result.current.reset()
    })

    expect(result.current.isStreaming).toBe(false)
    expect(result.current.messages).toEqual([])
    release?.()
  })
})

describe('useAssistantConversations', () => {
  it('loads the first history page', async () => {
    vi.mocked(chatFetch).mockResolvedValue({
      conversations: [],
      hasMore: false,
      nextCursor: null,
    })
    const client = createClient()
    renderHook(() => useAssistantConversations(true), {
      wrapper: wrapperFor(client),
    })

    await waitFor(() => {
      expect(chatFetch).toHaveBeenCalledWith(
        '/api/conversations/assistant?limit=20',
      )
    })
  })
})
