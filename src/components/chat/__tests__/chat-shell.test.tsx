import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatShell } from '@/components/chat/chat-shell'
import type { ChatSessionState } from '@/lib/chat/session'
import type {
  ChatThreadController,
  ViewMessage,
} from '@/lib/chat/use-chat-thread'

vi.mock('@/lib/chat/session', () => ({
  useChatSession: vi.fn(),
}))

vi.mock('@/lib/chat/use-chat-thread', () => ({
  useChatThread: vi.fn(),
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

function thread(
  overrides: Partial<ChatThreadController> = {},
): ChatThreadController {
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
    retry: vi.fn(async () => {}),
    edit: vi.fn(async () => {}),
    refetch: vi.fn(async () => {}),
    ...overrides,
  }
}

function setup(session: Partial<ChatSessionState> = {}) {
  vi.mocked(useChatSession).mockReturnValue({ ...sessionBase, ...session })
  vi.mocked(useChatThread).mockReturnValue(thread())
}

describe('ChatShell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setup()
  })

  it('shows the GitHub sign-in gate when signed out', () => {
    setup({ token: null, user: null, aiEligible: false })

    render(<ChatShell />)

    expect(
      screen.getByRole('button', { name: /continue with github/i }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('renders assistant history and the composer when signed in', () => {
    render(<ChatShell />)

    expect(screen.getByText('Hello from the assistant')).toBeInTheDocument()
    expect(
      screen.getByRole('textbox', { name: 'Message Portfolio assistant' }),
    ).toBeInTheDocument()
  })

  it('locks the assistant for an ineligible account', () => {
    setup({ aiEligible: false, aiReason: 'account_too_new' })

    render(<ChatShell />)

    expect(screen.getByText(/unlocks after one year/i)).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('shows the owner inbox only to the owner', () => {
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

    expect(screen.getByRole('button', { name: /inbox/i })).toBeInTheDocument()
  })

  it('hides the owner inbox from visitors', () => {
    render(<ChatShell />)

    expect(
      screen.queryByRole('button', { name: /inbox/i }),
    ).not.toBeInTheDocument()
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
    vi.mocked(useChatThread).mockReturnValue(
      thread({ hasMore: true, loadOlder }),
    )
    render(<ChatShell />)

    await user.click(
      screen.getByRole('button', { name: 'Load previous messages' }),
    )
    expect(loadOlder).toHaveBeenCalled()
  })

  it('retries a failed message', async () => {
    const user = userEvent.setup()
    const retry = vi.fn(async () => {})
    vi.mocked(useChatThread).mockReturnValue(
      thread({
        messages: [
          viewMessage({
            id: 'failed-1',
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
      expect.objectContaining({ id: 'failed-1' }),
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
    expect(
      within(article as HTMLElement).getByText('edited text'),
    ).toBeInTheDocument()
  })
})
