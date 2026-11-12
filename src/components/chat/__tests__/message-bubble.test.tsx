import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { chatProfilesById } from '@/data/chat'
import type { ViewMessage } from '@/lib/chat/use-chat-thread'
import { MessageBubble } from '../message-bubble'

function message(overrides: Partial<ViewMessage> = {}): ViewMessage {
  return {
    id: 'message-1',
    seq: 1,
    conversationId: 'conversation-1',
    author: 'owner',
    body: 'hello',
    status: 'complete',
    clientId: null,
    sentAt: '2026-11-12T09:00:00.000Z',
    editedAt: null,
    errorCode: null,
    ...overrides,
  }
}

describe('MessageBubble owner inbox direction', () => {
  it('puts an owner reply on the right', () => {
    render(
      <MessageBubble
        message={message({ author: 'owner', body: 'owner reply' })}
        profile={chatProfilesById.owner}
        ownAuthor="owner"
        onEdit={() => {}}
      />,
    )

    const article = screen.getByText('owner reply').closest('article')
    expect(article).toHaveAttribute('aria-label', 'You')
    expect(article?.className).toContain('justify-end')
  })

  it('puts a visitor message on the left with their label', () => {
    render(
      <MessageBubble
        message={message({ author: 'user', body: 'visitor message' })}
        profile={chatProfilesById.owner}
        ownAuthor="owner"
        incomingLabel="gitgitgit127"
        onEdit={() => {}}
      />,
    )

    const article = screen.getByText('visitor message').closest('article')
    expect(article).toHaveAttribute('aria-label', 'gitgitgit127')
    expect(article?.className).not.toContain('justify-end')
    expect(screen.getByText('gitgitgit127')).toBeInTheDocument()
  })
})
