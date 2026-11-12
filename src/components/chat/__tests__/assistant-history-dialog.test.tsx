import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AssistantHistoryDialog } from '@/components/chat/assistant-history-dialog'
import type { AssistantConversationDTO } from '@/lib/chat/protocol'

const conversations: AssistantConversationDTO[] = [
  {
    id: 'conversation-1',
    title: 'First chat',
    createdAt: '2026-11-10T09:00:00.000Z',
    lastMessageAt: '2026-11-12T09:00:00.000Z',
  },
  {
    id: 'conversation-2',
    title: 'Second chat',
    createdAt: '2026-11-11T09:00:00.000Z',
    lastMessageAt: '2026-11-11T09:00:00.000Z',
  },
]

function setup(overrides: Partial<Parameters<typeof AssistantHistoryDialog>[0]> = {}) {
  const props = {
    open: true,
    conversations,
    activeId: 'conversation-1',
    isLoading: false,
    error: null,
    hasMore: false,
    isFetchingMore: false,
    onClose: vi.fn(),
    onNew: vi.fn(),
    onSelect: vi.fn(),
    onDelete: vi.fn(),
    onLoadMore: vi.fn(),
    onRetry: vi.fn(),
    ...overrides,
  }
  render(<AssistantHistoryDialog {...props} />)
  return props
}

beforeEach(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute('open', '')
    }
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    }
  }
})

describe('AssistantHistoryDialog', () => {
  it('lists chats and marks the active one', () => {
    setup()

    expect(screen.getByText('First chat')).toBeInTheDocument()
    expect(screen.getByText('Second chat')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Open chat First chat' }),
    ).toHaveAttribute('aria-current', 'true')
  })

  it('starts a new chat', async () => {
    const user = userEvent.setup()
    const props = setup()

    await user.click(screen.getByRole('button', { name: 'New chat' }))
    expect(props.onNew).toHaveBeenCalled()
  })

  it('selects a chat', async () => {
    const user = userEvent.setup()
    const props = setup()

    await user.click(
      screen.getByRole('button', { name: 'Open chat Second chat' }),
    )
    expect(props.onSelect).toHaveBeenCalledWith('conversation-2')
  })

  it('asks before deleting a chat', async () => {
    const user = userEvent.setup()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const props = setup()

    await user.click(
      screen.getByRole('button', { name: 'Delete chat First chat' }),
    )
    expect(confirm).toHaveBeenCalled()
    expect(props.onDelete).toHaveBeenCalledWith('conversation-1')
  })

  it('keeps the chat when deletion is cancelled', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const props = setup()

    await user.click(
      screen.getByRole('button', { name: 'Delete chat First chat' }),
    )
    expect(props.onDelete).not.toHaveBeenCalled()
  })

  it('shows the empty state', () => {
    setup({ conversations: [] })

    expect(screen.getByText('No previous chats yet.')).toBeInTheDocument()
  })

  it('shows an error with retry', async () => {
    const user = userEvent.setup()
    const props = setup({ error: 'Could not load chats' })

    expect(screen.getByText('Could not load chats')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(props.onRetry).toHaveBeenCalled()
  })

  it('loads more chats', async () => {
    const user = userEvent.setup()
    const props = setup({ hasMore: true })

    await user.click(screen.getByRole('button', { name: 'Load more chats' }))
    expect(props.onLoadMore).toHaveBeenCalled()
  })
})
