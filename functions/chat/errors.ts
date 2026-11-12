import { ZodError } from 'zod'
import { ChatValidationError } from '../../src/lib/chat/protocol'

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'AI_LOCKED'
  | 'VALIDATION'
  | 'RATE_LIMITED'
  | 'DUPLICATE'
  | 'CONFLICT'
  | 'NOT_FOUND'
  | 'UPSTREAM_ERROR'
  | 'INTERNAL'

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  AI_LOCKED: 403,
  VALIDATION: 400,
  RATE_LIMITED: 429,
  DUPLICATE: 409,
  CONFLICT: 409,
  NOT_FOUND: 404,
  UPSTREAM_ERROR: 502,
  INTERNAL: 500,
}

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number
  readonly retryable: boolean

  constructor(
    code: ApiErrorCode,
    message: string,
    status = STATUS_BY_CODE[code],
    retryable = false,
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.retryable = retryable
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        retryable: this.retryable,
      },
    }
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error
  }

  if (error instanceof ChatValidationError) {
    return new ApiError('VALIDATION', error.message)
  }

  if (error instanceof ZodError) {
    return new ApiError('VALIDATION', error.issues[0]?.message ?? 'Invalid request')
  }

  console.error('[api] unhandled error', error)
  return new ApiError('INTERNAL', 'Internal server error')
}
