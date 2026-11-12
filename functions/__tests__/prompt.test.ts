import { describe, expect, it } from 'vitest'
import type { ChatMessageDTO } from '@/lib/chat/protocol'
import { buildAiContext, buildSystemPrompt } from '../chat/prompt'

function message(
  index: number,
  body: string,
  status: ChatMessageDTO['status'] = 'complete',
): ChatMessageDTO {
  return {
    id: `message-${index}`,
    seq: index,
    conversationId: 'conversation-1',
    author: index % 2 === 0 ? 'user' : 'assistant',
    body,
    status,
    clientId: null,
    sentAt: new Date(2026, 0, 1, 0, index).toISOString(),
    editedAt: null,
    errorCode: null,
  }
}

describe('buildSystemPrompt', () => {
  it('contains the portfolio facts the assistant needs', () => {
    const prompt = buildSystemPrompt()

    expect(prompt).toContain('Gopendranath Sasmal')
    expect(prompt).toContain('Full Stack Developer')
    expect(prompt).toContain('BTM Layout, Bengaluru, India')
    expect(prompt).toContain('Open to work')
    expect(prompt).toContain('movie-app-web')
    expect(prompt).toContain('terminal-web-vm')
    expect(prompt).toContain('RAG PDF Chat')
    expect(prompt).toContain('React')
    expect(prompt).toContain('gopendranathsasmal7@gmail.com')
  })

  it('does not leak secrets or environment values', () => {
    const prompt = buildSystemPrompt()
    expect(prompt).not.toContain('OPENROUTER')
    expect(prompt).not.toContain('DATABASE_URL')
    expect(prompt).not.toContain('sk-or-v1')
  })
})

describe('buildAiContext', () => {
  it('keeps only complete messages', () => {
    const context = buildAiContext([
      message(1, 'keep'),
      message(2, 'failed', 'failed'),
      message(3, 'streaming', 'streaming'),
      message(4, 'superseded', 'superseded'),
    ])
    expect(context.map((item) => item.content)).toEqual(['keep'])
  })

  it('keeps at most the last twenty messages', () => {
    const messages = Array.from({ length: 25 }, (_, index) =>
      message(index + 1, `message ${index + 1}`),
    )
    const context = buildAiContext(messages)
    expect(context).toHaveLength(20)
    expect(context[0]?.content).toBe('message 6')
    expect(context.at(-1)?.content).toBe('message 25')
  })

  it('drops the oldest messages to stay under the character cap', () => {
    const messages = Array.from({ length: 20 }, (_, index) =>
      message(index + 1, `${index + 1}`.padEnd(1000, 'x')),
    )
    const context = buildAiContext(messages)
    const total = context.reduce((sum, item) => sum + item.content.length, 0)
    expect(total).toBeLessThanOrEqual(12_000)
    expect(context.at(-1)?.content).toContain('20')
  })

  it('always keeps the newest user message', () => {
    const huge = message(21, 'latest question'.padEnd(20_000, 'x'))
    const context = buildAiContext([message(1, 'old'), huge])
    expect(context.at(-1)?.content).toContain('latest question')
  })
})
