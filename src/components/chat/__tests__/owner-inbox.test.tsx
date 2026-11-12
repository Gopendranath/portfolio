import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OwnerInbox } from '@/components/chat/owner-inbox'
import type { OwnerThreadDTO } from '@/lib/chat/protocol'
import type { ChatThreadController } from '@/lib/chat/use-chat-thread'

vi.mock('@/lib/chat/use-owner-inbox', () => ({
  useOwnerThreads: vi.fn(),
  useMarkOwnerThreadRead: vi.fn(),
  useMarkOwnerThreadUnread: vi.fn(),
}))

vi.mock('@/lib/chat/use-chat-thread', () => ({
  useChatThread: vi.fn(),
}))

import { useChatThread } from '@/lib/chat/use-chat-thread'
import {
  useMarkOwnerThreadRead,
  useMarkOwnerThreadUnread,
  useOwnerThreads,
} from '@/lib/chat/use-owner-inbox'

const visitorThread: OwnerThreadDTO = {
  conversationId: 'conversation-1',
  userId: 'visitor-1',
  githubLogin: 'gitgitgit127',
  lastMessage: 'hello master',
  lastMessageAt: '2026-11-12T09:00:00.000Z',
  unreadCount: 1,
}

function chatThread(): ChatThreadController {
  return {
    messages: [
      {
        id: 'message-1',
        seq: 1,
        conversationId: 'conversation-1',
        author: 'user',
        body: 'hello master',
        status: 'complete',
        clientId: null,
        sentAt: '2026-11-12T09:00:00.000Z',
        editedAt: null,
        errorCode: null,
      },
    ],
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
  }
}

function chatThreadWithNewMessage(): ChatThreadController {
  const controller = chatThread()
  return {
    ...controller,
    messages: [
      ...controller.messages,
      {
        id: 'message-2',
        seq: 2,
        conversationId: 'conversation-1',
        author: 'user',
        body: 'are you there?',
        status: 'complete',
        clientId: null,
        sentAt: '2026-11-12T09:01:00.000Z',
        editedAt: null,
        errorCode: null,
      },
    ],
  }
}

describe('OwnerInbox', () => {
  const markRead = vi.fn(async () => {})
  const markUnread = vi.fn(async () => {})

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useOwnerThreads).mockReturnValue({
      data: {
        pages: [{ threads: [visitorThread], hasMore: false, nextCursor: null }],
      },
      isLoading: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
    } as never)
    vi.mocked(useMarkOwnerThreadRead).mockReturnValue(markRead)
    vi.mocked(useMarkOwnerThreadUnread).mockReturnValue(markUnread)
    vi.mocked(useChatThread).mockReturnValue(chatThread())
  })

  it('marks the thread unread and returns to the inbox', async () => {
    const user = userEvent.setup()
    render(<OwnerInbox onBack={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /gitgitgit127/i }))
    expect(markRead).toHaveBeenCalledWith('visitor-1')

    await user.click(screen.getByRole('button', { name: 'Mark unread' }))

    expect(markUnread).toHaveBeenCalledWith('visitor-1')
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Inbox.' }),
      ).toBeInTheDocument()
    })
  })

  it('uses the same fixed header height for the inbox and a thread', async () => {
    const user = userEvent.setup()
    render(<OwnerInbox onBack={vi.fn()} />)

    const inboxHeader = screen
      .getByRole('heading', { name: 'Inbox.' })
      .closest('header')
    expect(inboxHeader).toHaveClass('h-20')

    await user.click(screen.getByRole('button', { name: /gitgitgit127/i }))

    const threadHeader = screen
      .getByRole('heading', { name: 'gitgitgit127' })
      .closest('header')
    expect(threadHeader).toHaveClass('h-20')
  })

  it('marks a new visitor message read while the thread is open', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<OwnerInbox onBack={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /gitgitgit127/i }))
    await waitFor(() => {
      expect(markRead).toHaveBeenCalledTimes(1)
    })

    vi.mocked(useChatThread).mockReturnValue(chatThreadWithNewMessage())
    rerender(<OwnerInbox onBack={vi.fn()} />)

    await waitFor(() => {
      expect(markRead).toHaveBeenCalledTimes(2)
    })
  })
})
