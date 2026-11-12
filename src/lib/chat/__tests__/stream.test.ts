import { afterEach, describe, expect, it, vi } from 'vitest'
import { streamChat } from '@/lib/chat/api-client'

function sseResponse(frames: string[]): Response {
  return new Response(frames.join(''), {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('streamChat', () => {
  it('parses meta, delta, and done frames', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          sseResponse([
            'event: meta\ndata: {"conversationId":"c1","userMessageId":"u1","assistantMessageId":"a1"}\n\n',
            'event: delta\ndata: {"text":"Hello "}\n\n',
            'event: delta\ndata: {"text":"world"}\n\n',
            'event: done\ndata: {"assistantMessageId":"a1","finishReason":"stop","truncated":false,"outputTokens":7}\n\n',
          ]),
        ),
    )

    const meta = vi.fn()
    const delta = vi.fn()
    const done = vi.fn()

    await streamChat(
      '/api/chat/assistant',
      { body: 'hello', clientId: 'client-1' },
      { onMeta: meta, onDelta: delta, onDone: done },
      undefined,
      'token',
    )

    expect(meta).toHaveBeenCalledWith({
      conversationId: 'c1',
      userMessageId: 'u1',
      assistantMessageId: 'a1',
    })
    expect(delta.mock.calls.map(([text]) => text).join('')).toBe('Hello world')
    expect(done).toHaveBeenCalledWith({
      assistantMessageId: 'a1',
      finishReason: 'stop',
      truncated: false,
      outputTokens: 7,
    })
  })

  it('ignores malformed frames', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          sseResponse([
            'event: delta\ndata: not-json\n\n',
            'event: delta\ndata: {"text":"ok"}\n\n',
          ]),
        ),
    )
    const delta = vi.fn()

    await streamChat('/api/chat/assistant', {}, { onDelta: delta }, undefined, 'token')

    expect(delta).toHaveBeenCalledTimes(1)
    expect(delta).toHaveBeenCalledWith('ok')
  })

  it('reports EOF without a terminal frame as interrupted', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(sseResponse(['event: delta\ndata: {"text":"hi"}\n\n'])),
    )
    const onError = vi.fn()

    await streamChat('/api/chat/assistant', {}, { onError }, undefined, 'token')

    expect(onError).toHaveBeenCalledWith({
      code: 'STREAM_INTERRUPTED',
      message: 'The response was interrupted.',
      retryable: true,
    })
  })

  it('reports a non-OK response as an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: 'RATE_LIMITED',
              message: 'Too many messages',
              retryable: true,
            },
          }),
          { status: 429, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )
    const onError = vi.fn()

    await streamChat('/api/chat/assistant', {}, { onError }, undefined, 'token')

    expect(onError).toHaveBeenCalledWith({
      code: 'RATE_LIMITED',
      message: 'Too many messages',
      retryable: true,
    })
  })
})
