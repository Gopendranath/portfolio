import type { Context } from 'hono'
import type { getPool } from '../chat/db'
import { ApiError } from '../chat/errors'
import {
  consumeGlobalAiLimit,
  consumeUserRateLimit,
  type RateLimitResult,
} from '../chat/rate-limit'

export function assertAllowedRateLimit(context: Context, result: RateLimitResult): void {
  if (result.allowed) {
    return
  }

  context.header('Retry-After', String(result.retryAfterSeconds))
  throw new ApiError(
    'RATE_LIMITED',
    result.reason === 'minute'
      ? 'Too many messages. Try again in a minute.'
      : 'Daily message limit reached. Try again tomorrow.',
    429,
    true,
  )
}

export function assertAiEligible(input: { aiEligible: boolean; aiReason: string }): void {
  if (input.aiEligible) {
    return
  }

  throw new ApiError(
    'AI_LOCKED',
    input.aiReason === 'account_too_new'
      ? 'Your GitHub account must be at least one year old to use the assistant.'
      : 'We could not verify your GitHub account age. Try again later.',
    403,
  )
}

export function assertOwner(isOwner: boolean): void {
  if (!isOwner) {
    throw new ApiError('FORBIDDEN', 'Owner access only', 403)
  }
}

export async function assertAiRateLimits(
  context: Context,
  pool: ReturnType<typeof getPool>,
  userId: string,
): Promise<void> {
  assertAllowedRateLimit(
    context,
    await consumeUserRateLimit(pool, {
      userId,
      action: 'assistant_send',
      perMinute: 5,
      perDay: 30,
    }),
  )
  assertAllowedRateLimit(context, await consumeGlobalAiLimit(pool))
}
