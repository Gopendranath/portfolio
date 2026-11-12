import { describe, expect, it } from 'vitest'
import { ChatValidationError } from '@/lib/chat/protocol'
import { ApiError, toApiError } from '../chat/errors'

describe('ApiError', () => {
  it('serializes to the public shape', () => {
    const error = new ApiError('UNAUTHORIZED', 'Missing token', 401)
    expect(error.toJSON()).toEqual({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing token',
        retryable: false,
      },
    })
  })

  it('maps validation errors to 400', () => {
    const error = toApiError(new ChatValidationError('Message is required'))
    expect(error.code).toBe('VALIDATION')
    expect(error.status).toBe(400)
    expect(error.retryable).toBe(false)
  })

  it('hides unknown errors behind INTERNAL', () => {
    const error = toApiError(new Error('database password leaked'))
    expect(error.code).toBe('INTERNAL')
    expect(error.message).not.toContain('password')
  })
})
