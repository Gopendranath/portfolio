import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatShell } from '@/components/chat/chat-shell'
import { chatFetch } from '@/lib/chat/api-client'
import type { AssistantConversationDTO } from '@/lib/chat/protocol'
import type { ChatSessionState } from '@/lib/chat/session'
import type { ChatThreadController, ViewMessage } from '@/lib/chat/use-chat-thread'

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}))

vi.mock('@/lib/chat/api-client', () => ({
  chatFetch: vi.fn(async () => ({ ok: true })),
}))

vi.mock('@/lib/chat/session', () => ({
  useChatSession: vi.fn(),
}))

vi.mock('@/lib/chat/use-chat-thread', () => ({
  useChatThread: vi.fn(),
}))

vi.mock('@/lib/chat/use-assistant-history', () => ({
  useAssistantConversations: vi.fn(),
  useDeleteAssistantConversation: vi.fn(),
}))

vi.mock('@/lib/chat/use-owner-inbox', () => ({
  useOwnerThreads: vi.fn(() => ({
    data: { pages: [{ threads: [], hasMore: false, nextCursor: null }] },
    isLoading: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
  })),
  useMarkOwnerThreadRead: vi.fn(() => vi.fn()),
}))

import { useChatSession } from '@/lib/chat/session'
import {
  useAssistantConversations,
  useDeleteAssistantConversation,
} from '@/lib/chat/use-assistant-history'
import { useChatThread } from '@/lib/chat/use-chat-thread'

const sessionBase: ChatSessionState = {
  user: {
    id: 'user-1',
    githubLogin: 'visitor',
    githubCreatedAt: '2020-01-01T00:00:00.000Z',
    role: 'user',
  },
  token: 'token',
  isOwner: false,
  aiEligible: true,
  aiReason: 'eligible',
  ownerUnreadCount: 0,
  isLoading: false,
  error: null,
  signIn: vi.fn(),
  signOut: vi.fn(),
}

function viewMessage(overrides: Partial<ViewMessage> = {}): ViewMessage {
  return {
    id: 'message-1',
    seq: 1,
    conversationId: 'conversation-1',
    author: 'assistant',
    body: 'Hello from the assistant',
    status: 'complete',
    clientId: null,
    sentAt: '2026-11-12T09:00:00.000Z',
    editedAt: null,
    errorCode: null,
    ...overrides,
  }
}

function thread(overrides: Partial<ChatThreadController> = {}): ChatThreadController {
  return {
    messages: [viewMessage()],
    isLoading: false,
    error: null,
    hasMore: false,
    isFetchingOlder: false,
    isSending: false,
    isStreaming: false,
    loadOlder: vi.fn(async () => {}),
    send: vi.fn(async () => {}),
    stop: vi.fn(),
    reset: vi.fn(),
    retry: vi.fn(async () => {}),
    edit: vi.fn(async () => {}),
    refetch: vi.fn(async () => {}),
    ...overrides,
  }
}

function conversation(overrides: Partial<AssistantConversationDTO> = {}): AssistantConversationDTO {
  return {
    id: 'conversation-1',
    title: 'First chat',
    createdAt: '2026-11-10T09:00:00.000Z',
    lastMessageAt: '2026-11-12T09:00:00.000Z',
    ...overrides,
  }
}

function history(
  conversations: AssistantConversationDTO[] = [],
  overrides: Record<string, unknown> = {},
) {
  return {
    data: {
      pages: [{ conversations, hasMore: false, nextCursor: null }],
    },
    isLoading: false,
    error: null,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
    ...overrides,
  }
}

function setup(
  session: Partial<ChatSessionState> = {},
  conversations: AssistantConversationDTO[] = [],
  deleteImpl: () => Promise<void> = async () => {},
) {
  vi.mocked(useChatSession).mockReturnValue({ ...sessionBase, ...session })
  vi.mocked(useChatThread).mockReturnValue(thread())
  vi.mocked(useAssistantConversations).mockReturnValue(
    history(conversations) as unknown as ReturnType<typeof useAssistantConversations>,
  )
  const deleteConversation = vi.fn(deleteImpl)
  vi.mocked(useDeleteAssistantConversation).mockReturnValue(deleteConversation)
  return { deleteConversation }
}

function assistantThreadOptions() {
  const calls = vi
    .mocked(useChatThread)
    .mock.calls.filter(([options]) => options.kind === 'assistant')
  return calls.at(-1)?.[0]
}

function installDialogPolyfill() {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute('open', '')
    }
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    }
  }
}

describe('ChatShell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    installDialogPolyfill()
    setup()
  })

  it('shows the GitHub sign-in gate when signed out', () => {
    setup({ token: null, user: null, aiEligible: false })

    render(<ChatShell />)

    expect(screen.getByRole('button', { name: /continue with github/i })).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('renders assistant history and the composer when signed in', () => {
    render(<ChatShell />)

    expect(screen.getByText('Hello from the assistant')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Message Portfolio assistant' })).toBeInTheDocument()
  })

  it('locks the assistant for an ineligible account', () => {
    setup({ aiEligible: false, aiReason: 'account_too_new' })

    render(<ChatShell />)

    expect(screen.getByText(/unlocks after one year/i)).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('shows the history triggers for an eligible assistant', () => {
    render(<ChatShell />)

    expect(screen.getAllByRole('button', { name: 'Chat history' }).length).toBeGreaterThan(0)
  })

  it('hides the history triggers when the assistant is locked', () => {
    setup({ aiEligible: false, aiReason: 'account_too_new' })

    render(<ChatShell />)

    expect(screen.queryByRole('button', { name: 'Chat history' })).not.toBeInTheDocument()
  })

  it('hides the history triggers in the owner inbox', async () => {
    const user = userEvent.setup()
    setup({
      isOwner: true,
      user: {
        id: 'user-1',
        githubLogin: 'visitor',
        githubCreatedAt: '2020-01-01T00:00:00.000Z',
        role: 'owner',
      },
    })

    render(<ChatShell />)
    await user.click(screen.getByRole('button', { name: /inbox/i }))

    expect(screen.queryByRole('button', { name: 'Chat history' })).not.toBeInTheDocument()
  })

  it('shows the owner inbox in the same nav grid as the assistant', () => {
    setup({
      isOwner: true,
      user: {
        id: 'user-1',
        githubLogin: 'visitor',
        githubCreatedAt: '2020-01-01T00:00:00.000Z',
        role: 'owner',
      },
    })

    render(<ChatShell />)

    const nav = screen.getByRole('group', { name: 'Chat profiles' })
    expect(within(nav).getByRole('button', { name: /inbox/i })).toBeInTheDocument()
    expect(within(nav).getByRole('button', { name: /portfolio assistant/i })).toBeInTheDocument()
  })

  it('marks owner messages read when a new message arrives in the open thread', async () => {
    const user = userEvent.setup()
    const first = viewMessage({ id: 'owner-message-1', author: 'owner' })
    vi.mocked(useChatThread).mockReturnValue(thread({ messages: [first] }))
    const { rerender } = render(<ChatShell />)

    await user.click(screen.getByRole('button', { name: /Gopendranath Sasmal/i }))

    await waitFor(() => {
      expect(chatFetch).toHaveBeenCalledWith('/api/conversations/owner/read', {
        method: 'POST',
      })
    })

    vi.mocked(chatFetch).mockClear()
    vi.mocked(useChatThread).mockReturnValue(
      thread({
        messages: [first, viewMessage({ id: 'owner-message-2', author: 'owner' })],
      }),
    )
    rerender(<ChatShell />)

    await waitFor(() => {
      expect(chatFetch).toHaveBeenCalledWith('/api/conversations/owner/read', {
        method: 'POST',
      })
    })
  })

  it('hides the owner inbox from visitors', () => {
    render(<ChatShell />)

    expect(screen.queryByRole('button', { name: /inbox/i })).not.toBeInTheDocument()
  })

  it('sends the draft and clears the composer', async () => {
    const user = userEvent.setup()
    const send = vi.fn(async () => {})
    vi.mocked(useChatThread).mockReturnValue(thread({ send }))
    render(<ChatShell />)

    const composer = screen.getByRole('textbox', {
      name: 'Message Portfolio assistant',
    })
    await user.type(composer, 'new question')
    await user.click(screen.getByRole('button', { name: 'Send message' }))

    expect(send).toHaveBeenCalledWith('new question')
    expect(composer).toHaveValue('')
  })

  it('shows the load previous control and calls the loader', async () => {
    const user = userEvent.setup()
    const loadOlder = vi.fn(async () => {})
    vi.mocked(useChatThread).mockReturnValue(thread({ hasMore: true, loadOlder }))
    render(<ChatShell />)

    await user.click(screen.getByRole('button', { name: 'Load previous messages' }))
    expect(loadOlder).toHaveBeenCalled()
  })

  it('retries a failed message', async () => {
    const user = userEvent.setup()
    const retry = vi.fn(async () => {})
    vi.mocked(useChatThread).mockReturnValue(
      thread({
        messages: [
          viewMessage({
            id: '11111111-1111-4111-8111-111111111111',
            author: 'assistant',
            body: 'partial',
            status: 'failed',
            errorCode: 'UPSTREAM_ERROR',
          }),
        ],
        retry,
      }),
    )
    render(<ChatShell />)

    await user.click(screen.getByRole('button', { name: 'Retry message' }))
    expect(retry).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '11111111-1111-4111-8111-111111111111',
      }),
    )
  })

  it('renders the edited timestamp on an edited message', () => {
    vi.mocked(useChatThread).mockReturnValue(
      thread({
        messages: [
          viewMessage({
            author: 'user',
            body: 'edited text',
            editedAt: '2026-11-12T09:30:00.000Z',
          }),
        ],
      }),
    )
    render(<ChatShell />)

    const article = screen.getByText('edited text').closest('article')
    expect(article).not.toBeNull()
    const editedTime = (article as HTMLElement).querySelector(
      'time[datetime="2026-11-12T09:30:00.000Z"]',
    )
    expect(editedTime?.parentElement?.textContent).toMatch(/^edited/)
    expect(within(article as HTMLElement).getByText('edited text')).toBeInTheDocument()
  })

  it('opens the newest chat automatically', () => {
    const latest = conversation()
    setup({}, [
      latest,
      conversation({
        id: 'conversation-2',
        title: 'Second chat',
        lastMessageAt: '2026-11-11T09:00:00.000Z',
      }),
    ])

    render(<ChatShell />)

    expect(assistantThreadOptions()?.conversationId).toBe(latest.id)
  })

  it('switches to a selected chat and clears transient state', async () => {
    const user = userEvent.setup()
    const second = conversation({
      id: 'conversation-2',
      title: 'Second chat',
      lastMessageAt: '2026-11-11T09:00:00.000Z',
    })
    setup({}, [conversation(), second])
    const reset = vi.fn()
    vi.mocked(useChatThread).mockReturnValue(thread({ reset }))
    render(<ChatShell />)

    await user.click(screen.getAllByRole('button', { name: 'Chat history' })[0] as HTMLElement)
    await user.click(screen.getByRole('button', { name: 'Open chat Second chat' }))

    expect(reset).toHaveBeenCalled()
    expect(assistantThreadOptions()?.conversationId).toBe(second.id)
  })

  it('starts a blank chat', async () => {
    const user = userEvent.setup()
    setup({}, [conversation()])
    render(<ChatShell />)

    await user.click(screen.getAllByRole('button', { name: 'Chat history' })[0] as HTMLElement)
    await user.click(screen.getByRole('button', { name: 'New chat' }))

    expect(assistantThreadOptions()?.conversationId).toBeNull()
  })

  it('stops a streaming reply before switching chats', async () => {
    const user = userEvent.setup()
    const stop = vi.fn()
    const reset = vi.fn()
    const second = conversation({
      id: 'conversation-2',
      title: 'Second chat',
      lastMessageAt: '2026-11-11T09:00:00.000Z',
    })
    setup({}, [conversation(), second])
    vi.mocked(useChatThread).mockReturnValue(thread({ isStreaming: true, stop, reset }))
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<ChatShell />)

    await user.click(screen.getAllByRole('button', { name: 'Chat history' })[0] as HTMLElement)
    await user.click(screen.getByRole('button', { name: 'Open chat Second chat' }))

    expect(stop).toHaveBeenCalled()
    expect(reset).toHaveBeenCalled()
    expect(assistantThreadOptions()?.conversationId).toBe(second.id)
  })

  it('keeps drafts separate for each chat', async () => {
    const user = userEvent.setup()
    const second = conversation({
      id: 'conversation-2',
      title: 'Second chat',
      lastMessageAt: '2026-11-11T09:00:00.000Z',
    })
    setup({}, [conversation(), second])
    render(<ChatShell />)

    const composer = screen.getByRole('textbox', {
      name: 'Message Portfolio assistant',
    })
    await user.type(composer, 'first draft')

    await user.click(screen.getAllByRole('button', { name: 'Chat history' })[0] as HTMLElement)
    await user.click(screen.getByRole('button', { name: 'Open chat Second chat' }))
    expect(composer).toHaveValue('')

    await user.type(composer, 'second draft')
    await user.click(screen.getAllByRole('button', { name: 'Chat history' })[0] as HTMLElement)
    await user.click(screen.getByRole('button', { name: 'Open chat First chat' }))

    expect(composer).toHaveValue('first draft')
  })

  it('keeps a draft typed while history is still loading', async () => {
    const user = userEvent.setup()
    setup()
    vi.mocked(useAssistantConversations).mockReturnValue(
      history([], { isLoading: true }) as unknown as ReturnType<typeof useAssistantConversations>,
    )
    const { rerender } = render(<ChatShell />)

    const composer = screen.getByRole('textbox', {
      name: 'Message Portfolio assistant',
    })
    await user.type(composer, 'typed while loading')

    vi.mocked(useAssistantConversations).mockReturnValue(
      history([conversation()]) as unknown as ReturnType<typeof useAssistantConversations>,
    )
    rerender(<ChatShell />)

    expect(composer).toHaveValue('typed while loading')
    expect(assistantThreadOptions()?.conversationId).toBeNull()
  })

  it('does not request assistant history in the owner inbox', async () => {
    const user = userEvent.setup()
    setup({
      isOwner: true,
      user: {
        id: 'user-1',
        githubLogin: 'visitor',
        githubCreatedAt: '2020-01-01T00:00:00.000Z',
        role: 'owner',
      },
    })
    render(<ChatShell />)

    await user.click(screen.getByRole('button', { name: /inbox/i }))

    expect(vi.mocked(useAssistantConversations).mock.calls.at(-1)?.[0]).toBe(false)
  })

  it('deletes the active chat and falls back to the newest remaining', async () => {
    const user = userEvent.setup()
    const second = conversation({
      id: 'conversation-2',
      title: 'Second chat',
      lastMessageAt: '2026-11-11T09:00:00.000Z',
    })
    const { deleteConversation } = setup({}, [conversation(), second], async () => {
      vi.mocked(useAssistantConversations).mockReturnValue(
        history([second]) as unknown as ReturnType<typeof useAssistantConversations>,
      )
    })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<ChatShell />)

    await user.click(screen.getAllByRole('button', { name: 'Chat history' })[0] as HTMLElement)
    await user.click(screen.getByRole('button', { name: 'Delete chat First chat' }))

    expect(deleteConversation).toHaveBeenCalledWith('conversation-1')
    await waitFor(() => {
      expect(assistantThreadOptions()?.conversationId).toBe(second.id)
    })
  })

  it('restores the draft when the active chat was deleted elsewhere', async () => {
    const user = userEvent.setup()
    setup({}, [conversation()])
    render(<ChatShell />)

    const options = assistantThreadOptions()
    act(() => {
      options?.onConversationLost?.('conversation-1', 'keep this text')
    })

    expect(
      screen.getByText('This chat was deleted. Your message was not sent.'),
    ).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'Chat history' })[0] as HTMLElement)
    await user.click(screen.getByRole('button', { name: 'New chat' }))

    expect(
      screen.getByRole('textbox', {
        name: 'Message Portfolio assistant',
      }),
    ).toHaveValue('keep this text')
  })
})
