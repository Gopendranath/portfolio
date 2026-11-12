import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest'
import {
  consumeGlobalAiLimit,
  consumeUserRateLimit,
  pruneRateLimits,
} from '../chat/rate-limit'

const hasDatabase = Boolean(process.env.DATABASE_URL)
const pool = hasDatabase
  ? new Pool({ connectionString: process.env.DATABASE_URL, max: 2 })
  : null

let userId = ''

function requirePool(): Pool {
  if (!pool) {
    throw new Error('DATABASE_URL is required for this test')
  }
  return pool
}

async function createTestUser(): Promise<string> {
  const authUserId = `test-rate-${randomUUID()}`
  const githubId = String(
    2_000_000_000 + Math.floor(Math.random() * 800_000_000),
  )
  const { rows } = await requirePool().query<{ id: string }>(
    `insert into app_users (auth_user_id, github_id)
     values ($1, $2)
     returning id`,
    [authUserId, githubId],
  )
  const row = rows[0]
  if (!row) {
    throw new Error('Could not create test user')
  }
  return row.id
}

describe.skipIf(!hasDatabase)('rate limits', () => {
  beforeAll(async () => {
    await requirePool().query('select 1')
  })

  beforeEach(async () => {
    userId = await createTestUser()
  })

  afterEach(async () => {
    await requirePool().query('delete from app_users where id = $1', [userId])
    await requirePool().query(
      "delete from global_ai_usage where window_start >= '2030-01-01'",
    )
  })

  afterAll(async () => {
    await requirePool().end()
  })

  it('allows ten owner sends per minute and denies the eleventh', async () => {
    const now = new Date('2030-01-01T12:00:00Z')
    const results = []

    for (let index = 0; index < 11; index += 1) {
      results.push(
        await consumeUserRateLimit(requirePool(), {
          userId,
          action: 'owner_send',
          perMinute: 10,
          perDay: 60,
          now,
        }),
      )
    }

    expect(results.slice(0, 10).every((result) => result.allowed)).toBe(true)
    expect(results[10]).toMatchObject({
      allowed: false,
      reason: 'minute',
    })
  })

  it('denies after the daily owner limit', async () => {
    const now = new Date('2030-01-01T12:00:00Z')
    const first = await consumeUserRateLimit(requirePool(), {
      userId,
      action: 'owner_send',
      perMinute: 100,
      perDay: 2,
      now,
    })
    const second = await consumeUserRateLimit(requirePool(), {
      userId,
      action: 'owner_send',
      perMinute: 100,
      perDay: 2,
      now,
    })
    const third = await consumeUserRateLimit(requirePool(), {
      userId,
      action: 'owner_send',
      perMinute: 100,
      perDay: 2,
      now,
    })

    expect(first.allowed).toBe(true)
    expect(second.allowed).toBe(true)
    expect(third).toMatchObject({ allowed: false, reason: 'day' })
  })

  it('applies the global minute limit', async () => {
    const now = new Date('2030-01-01T12:00:00Z')
    const results = []

    for (let index = 0; index < 21; index += 1) {
      results.push(
        await consumeGlobalAiLimit(requirePool(), now, {
          minuteLimit: 20,
          dayLimit: 1000,
        }),
      )
    }

    expect(results.slice(0, 20).every((result) => result.allowed)).toBe(true)
    expect(results[20]).toMatchObject({ allowed: false, reason: 'minute' })
  })

  it('applies the global daily limit', async () => {
    const now = new Date('2030-01-01T12:00:00Z')
    const first = await consumeGlobalAiLimit(requirePool(), now, {
      minuteLimit: 1000,
      dayLimit: 1,
    })
    const second = await consumeGlobalAiLimit(requirePool(), now, {
      minuteLimit: 1000,
      dayLimit: 1,
    })

    expect(first.allowed).toBe(true)
    expect(second).toMatchObject({ allowed: false, reason: 'day' })
  })

  it('prunes old rate-limit events', async () => {
    const now = new Date('2030-01-01T12:00:00Z')
    await requirePool().query(
      `insert into rate_limit_events (user_id, action, created_at)
       values ($1, 'owner_send', $2::timestamptz - interval '3 days')`,
      [userId, now],
    )

    await pruneRateLimits(requirePool(), now)

    const { rows } = await requirePool().query(
      "select count(*)::int as count from rate_limit_events where user_id = $1 and action = 'owner_send'",
      [userId],
    )
    expect(rows[0]?.count).toBe(0)
  })
})
