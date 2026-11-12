import type { Pool } from 'pg'

export type RateLimitResult =
  | { allowed: true }
  | {
      allowed: false
      reason: 'minute' | 'day'
      retryAfterSeconds: number
    }

export interface UserRateLimitInput {
  userId: string
  action: string
  perMinute: number
  perDay: number
  now?: Date
}

const DAY_MS = 24 * 60 * 60 * 1000

function startOfUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

function secondsUntilNextUtcDay(now: Date): number {
  return Math.max(1, Math.ceil((startOfUtcDay(now).getTime() + DAY_MS - now.getTime()) / 1000))
}

export async function consumeUserRateLimit(
  pool: Pool,
  input: UserRateLimitInput,
): Promise<RateLimitResult> {
  const now = input.now ?? new Date()
  const client = await pool.connect()

  try {
    await client.query('begin')
    await client.query('select pg_advisory_xact_lock(hashtext($1)::bigint)', [input.userId])

    await client.query(
      `delete from rate_limit_events
        where created_at < $1::timestamptz - interval '48 hours'`,
      [now],
    )

    await client.query(
      `insert into rate_limit_events (user_id, action, created_at)
       values ($1, $2, $3)`,
      [input.userId, input.action, now],
    )

    const { rows } = await client.query<{
      minute_count: number
      day_count: number
      oldest_minute: Date | null
    }>(
      `select
         count(*) filter (
           where created_at > $2::timestamptz - interval '1 minute'
         )::int as minute_count,
         count(*)::int as day_count,
         min(created_at) filter (
           where created_at > $2::timestamptz - interval '1 minute'
         ) as oldest_minute
       from rate_limit_events
       where user_id = $1
         and action = $3
         and created_at >= $4`,
      [input.userId, now, input.action, startOfUtcDay(now)],
    )

    const counts = rows[0]
    if (!counts) {
      throw new Error('Rate limit query returned no rows')
    }

    if (counts.minute_count > input.perMinute) {
      await client.query('rollback')
      const oldest = counts.oldest_minute?.getTime() ?? now.getTime()
      return {
        allowed: false,
        reason: 'minute',
        retryAfterSeconds: Math.max(1, Math.ceil((oldest + 60_000 - now.getTime()) / 1000)),
      }
    }

    if (counts.day_count > input.perDay) {
      await client.query('rollback')
      return {
        allowed: false,
        reason: 'day',
        retryAfterSeconds: secondsUntilNextUtcDay(now),
      }
    }

    await client.query('commit')
    return { allowed: true }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

export async function consumeGlobalAiLimit(
  pool: Pool,
  now = new Date(),
  limits: { minuteLimit?: number; dayLimit?: number } = {},
): Promise<RateLimitResult> {
  const minuteLimit = limits.minuteLimit ?? 20
  const dayLimit = limits.dayLimit ?? 1000
  const minuteStart = new Date(Math.floor(now.getTime() / 60_000) * 60_000)
  const dayStart = startOfUtcDay(now)
  const client = await pool.connect()

  try {
    await client.query('begin')
    await client.query("select pg_advisory_xact_lock(hashtext('openrouter-global')::bigint)")

    const { rows } = await client.query<{
      window_kind: 'minute' | 'day'
      requests: number
    }>(
      `insert into global_ai_usage (window_start, window_kind, requests)
       values ($1, 'minute', 1), ($2, 'day', 1)
       on conflict (window_start, window_kind)
       do update set requests = global_ai_usage.requests + 1
       returning window_kind, requests`,
      [minuteStart, dayStart],
    )

    const minute = rows.find((row) => row.window_kind === 'minute')
    const day = rows.find((row) => row.window_kind === 'day')

    if ((minute?.requests ?? 0) > minuteLimit) {
      await client.query('rollback')
      return {
        allowed: false,
        reason: 'minute',
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((minuteStart.getTime() + 60_000 - now.getTime()) / 1000),
        ),
      }
    }

    if ((day?.requests ?? 0) > dayLimit) {
      await client.query('rollback')
      return {
        allowed: false,
        reason: 'day',
        retryAfterSeconds: secondsUntilNextUtcDay(now),
      }
    }

    await client.query('commit')
    return { allowed: true }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

export async function pruneRateLimits(pool: Pool, now = new Date()): Promise<void> {
  await pool.query(
    `delete from rate_limit_events
      where created_at < $1::timestamptz - interval '48 hours'`,
    [now],
  )
}
