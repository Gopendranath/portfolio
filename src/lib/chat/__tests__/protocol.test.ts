import { describe, expect, it } from 'vitest'
import {
  assistantHistoryQuerySchema,
  assistantMessagesQuerySchema,
  assistantSendSchema,
  MAX_MESSAGE_LENGTH,
  normalizeBody,
  paginationSchema,
  sendMessageSchema,
} from '@/lib/chat/protocol'

describe('normalizeBody', () => {
  it('trims surrounding whitespace and normalizes unicode', () => {
    expect(normalizeBody('  hello  ')).toBe('hello')
    expect(normalizeBody('e\u0301')).toBe('\u00e9')
  })

  it('rejects empty bodies', () => {
    expect(() => normalizeBody('   ')).toThrow(/required/i)
  })

  it('rejects control characters', () => {
    expect(() => normalizeBody('a\u0000b')).toThrow(/control/i)
  })

  it('rejects bodies over the limit', () => {
    expect(() => normalizeBody('x'.repeat(MAX_MESSAGE_LENGTH + 1))).toThrow(
      /2000/,
    )
  })
})

describe('sendMessageSchema', () => {
  it('rejects a missing client id', () => {
    const result = sendMessageSchema.safeParse({ body: 'hello' })
    expect(result.success).toBe(false)
  })

  it('rejects an empty client id', () => {
    const result = sendMessageSchema.safeParse({ body: 'hello', clientId: '' })
    expect(result.success).toBe(false)
  })

  it('accepts a uuid client id', () => {
    const result = sendMessageSchema.safeParse({
      body: 'hello',
      clientId: '6f1c5a8e-3f7e-4c1e-9a0e-2d4b6c8d0e2f',
    })
    expect(result.success).toBe(true)
  })
})

describe('paginationSchema', () => {
  it('defaults to ten', () => {
    expect(paginationSchema.parse({})).toEqual({ limit: 10 })
  })

  it('rejects more than ten', () => {
    expect(paginationSchema.safeParse({ limit: 11 }).success).toBe(false)
  })

  it('coerces query-string limits', () => {
    expect(paginationSchema.parse({ limit: '5' })).toEqual({ limit: 5 })
  })
})

describe('assistant history schemas', () => {
  const conversationId = '6f1c5a8e-3f7e-4c1e-9a0e-2d4b6c8d0e2f'

  it('defaults the history page size to twenty', () => {
    expect(assistantHistoryQuerySchema.parse({})).toEqual({ limit: 20 })
  })

  it('rejects history pages over fifty', () => {
    expect(assistantHistoryQuerySchema.safeParse({ limit: 51 }).success).toBe(
      false,
    )
  })

  it('accepts an optional conversation id on send', () => {
    expect(
      assistantSendSchema.safeParse({
        body: 'hello',
        clientId: 'client-test-0001',
      }).success,
    ).toBe(true)
    expect(
      assistantSendSchema.safeParse({
        body: 'hello',
        clientId: 'client-test-0001',
        conversationId,
      }).success,
    ).toBe(true)
    expect(
      assistantSendSchema.safeParse({
        body: 'hello',
        clientId: 'client-test-0001',
        conversationId: null,
      }).success,
    ).toBe(true)
  })

  it('requires a uuid conversation id on reads', () => {
    expect(
      assistantMessagesQuerySchema.safeParse({ limit: '10' }).success,
    ).toBe(false)
    expect(
      assistantMessagesQuerySchema.parse({ limit: '10', conversationId }),
    ).toEqual({ limit: 10, conversationId })
  })
})
