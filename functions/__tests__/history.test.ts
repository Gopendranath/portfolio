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
import { createMessage, getOrCreateConversation } from '../chat/conversations'
import {
  createAssistantConversation,
  deleteAssistantConversation,
  findAssistantConversationByClientId,
  getLatestAssistantConversation,
  getOwnedAssistantConversation,
  listAssistantConversations,
  retitleAssistantConversation,
  setAssistantTitleIfEmpty,
  titleFromBody,
} from '../chat/history'

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL)
const pool = hasDatabase
  ? new Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 2 })
  : null

let userId = ''

function requirePool(): Pool {
  if (!pool) {
    throw new Error('TEST_DATABASE_URL is required for this test')
  }
  return pool
}

async function createTestUser(): Promise<string> {
  const authUserId = `test-history-${randomUUID()}`
  const githubId = String(
    5_000_000_000 + Math.floor(Math.random() * 900_000_000),
  )
  const { rows } = await requirePool().query<{ id: string }>(
    `insert into app_users (auth_user_id, github_id, github_login, github_created_at, github_checked_at)
     values ($1, $2, 'test-history', now() - interval '2 years', now())
     returning id`,
    [authUserId, githubId],
  )
  const row = rows[0]
  if (!row) {
    throw new Error('Could not create test user')
  }
  return row.id
}

async function conversationTitle(
  conversationId: string,
): Promise<string | null> {
  const { rows } = await requirePool().query<{ title: string | null }>(
    'select title from conversations where id = $1',
    [conversationId],
  )
  return rows[0]?.title ?? null
}

describe.skipIf(!hasDatabase)('assistant history helpers', () => {
  beforeAll(async () => {
    await requirePool().query('select 1')
  })

  beforeEach(async () => {
    userId = await createTestUser()
  })

  afterEach(async () => {
    await requirePool().query('delete from app_users where id = $1', [userId])
  })

  afterAll(async () => {
    await requirePool().end()
  })

  it('creates multiple assistant conversations for one user', async () => {
    const first = await createAssistantConversation(requirePool(), userId)
    const second = await createAssistantConversation(requirePool(), userId)

    expect(second.id).not.toBe(first.id)
  })

  it('finds the latest assistant conversation for legacy clients', async () => {
    const older = await createAssistantConversation(requirePool(), userId)
    const newer = await createAssistantConversation(requirePool(), userId)
    await requirePool().query(
      `update conversations set last_message_at = now() - interval '1 hour' where id = $1`,
      [older.id],
    )
    await requirePool().query(
      `update conversations set last_message_at = now() where id = $1`,
      [newer.id],
    )

    await expect(
      getLatestAssistantConversation(requirePool(), userId),
    ).resolves.toEqual({ id: newer.id })
  })

  it('finds a conversation by client id for retries', async () => {
    const conversation = await createAssistantConversation(
      requirePool(),
      userId,
    )
    await createMessage(requirePool(), {
      conversationId: conversation.id,
      author: 'user',
      body: 'retry target',
      clientId: 'history-client-0001',
    })

    await expect(
      findAssistantConversationByClientId(
        requirePool(),
        userId,
        'history-client-0001',
      ),
    ).resolves.toEqual({ id: conversation.id })
    await expect(
      findAssistantConversationByClientId(
        requirePool(),
        userId,
        'history-client-missing',
      ),
    ).resolves.toBeNull()
  })

  it('keeps one owner conversation per user', async () => {
    const first = await getOrCreateConversation(requirePool(), userId, 'owner')
    const second = await getOrCreateConversation(requirePool(), userId, 'owner')

    expect(second.id).toBe(first.id)
  })

  it('lists non-empty assistant chats by recent activity', async () => {
    const older = await createAssistantConversation(requirePool(), userId)
    const newer = await createAssistantConversation(requirePool(), userId)
    const empty = await createAssistantConversation(requirePool(), userId)

    await createMessage(requirePool(), {
      conversationId: older.id,
      author: 'user',
      body: 'older question',
      clientId: 'history-older-0001',
    })
    await createMessage(requirePool(), {
      conversationId: newer.id,
      author: 'user',
      body: 'newer question',
      clientId: 'history-newer-0001',
    })
    await requirePool().query(
      `update conversations set last_message_at = now() - interval '1 hour' where id = $1`,
      [older.id],
    )
    await requirePool().query(
      `update conversations set last_message_at = now() - interval '1 minute' where id = $1`,
      [newer.id],
    )

    const page = await listAssistantConversations(requirePool(), userId)

    expect(page.conversations.map((conversation) => conversation.id)).toEqual([
      newer.id,
      older.id,
    ])
    expect(
      page.conversations.some((conversation) => conversation.id === empty.id),
    ).toBe(false)
  })

  it('paginates the history list', async () => {
    const first = await createAssistantConversation(requirePool(), userId)
    const second = await createAssistantConversation(requirePool(), userId)

    await createMessage(requirePool(), {
      conversationId: first.id,
      author: 'user',
      body: 'first',
      clientId: 'history-page-0001',
    })
    await createMessage(requirePool(), {
      conversationId: second.id,
      author: 'user',
      body: 'second',
      clientId: 'history-page-0002',
    })
    await requirePool().query(
      `update conversations set last_message_at = now() - interval '1 hour' where id = $1`,
      [first.id],
    )
    await requirePool().query(
      `update conversations set last_message_at = now() where id = $1`,
      [second.id],
    )

    const page = await listAssistantConversations(requirePool(), userId, {
      limit: 1,
    })

    expect(page.conversations).toHaveLength(1)
    expect(page.hasMore).toBe(true)
    expect(page.nextCursor).not.toBeNull()

    const next = await listAssistantConversations(requirePool(), userId, {
      limit: 1,
      before: page.nextCursor ?? undefined,
    })
    expect(next.conversations[0]?.id).toBe(first.id)
    expect(next.hasMore).toBe(false)
  })

  it('keeps microsecond cursor precision between pages', async () => {
    const first = await createAssistantConversation(requirePool(), userId)
    const second = await createAssistantConversation(requirePool(), userId)
    await createMessage(requirePool(), {
      conversationId: first.id,
      author: 'user',
      body: 'first microsecond',
      clientId: 'history-micro-0001',
    })
    await createMessage(requirePool(), {
      conversationId: second.id,
      author: 'user',
      body: 'second microsecond',
      clientId: 'history-micro-0002',
    })
    await requirePool().query(
      `update conversations
          set last_message_at = '2026-11-12 09:00:00.123456+00'
        where id = $1`,
      [first.id],
    )
    await requirePool().query(
      `update conversations
          set last_message_at = '2026-11-12 09:00:00.123100+00'
        where id = $1`,
      [second.id],
    )

    const page = await listAssistantConversations(requirePool(), userId, {
      limit: 1,
    })
    const next = await listAssistantConversations(requirePool(), userId, {
      limit: 1,
      before: page.nextCursor ?? undefined,
    })

    expect(page.conversations[0]?.id).toBe(first.id)
    expect(next.conversations[0]?.id).toBe(second.id)
  })

  it('normalizes and truncates titles', () => {
    expect(titleFromBody('  Hello\n\n  world  ')).toBe('Hello world')
    expect(titleFromBody('x'.repeat(100))).toHaveLength(80)
  })

  it('sets the title once from the first user message', async () => {
    const conversation = await createAssistantConversation(
      requirePool(),
      userId,
    )

    await setAssistantTitleIfEmpty(
      requirePool(),
      conversation.id,
      'first question',
    )
    await setAssistantTitleIfEmpty(
      requirePool(),
      conversation.id,
      'later question',
    )

    expect(await conversationTitle(conversation.id)).toBe('first question')
  })

  it('retitles only when the earliest visible user message changes', async () => {
    const conversation = await createAssistantConversation(
      requirePool(),
      userId,
    )
    const first = await createMessage(requirePool(), {
      conversationId: conversation.id,
      author: 'user',
      body: 'first question',
      clientId: 'history-first-0001',
    })
    const second = await createMessage(requirePool(), {
      conversationId: conversation.id,
      author: 'user',
      body: 'second question',
      clientId: 'history-second-0001',
    })
    await setAssistantTitleIfEmpty(
      requirePool(),
      conversation.id,
      'first question',
    )

    await retitleAssistantConversation(
      requirePool(),
      conversation.id,
      second.seq,
      'edited second',
    )
    expect(await conversationTitle(conversation.id)).toBe('first question')

    await retitleAssistantConversation(
      requirePool(),
      conversation.id,
      first.seq,
      'edited first',
    )
    expect(await conversationTitle(conversation.id)).toBe('edited first')
  })

  it('rejects reads and deletes from another user', async () => {
    const otherUserId = await createTestUser()
    const conversation = await createAssistantConversation(
      requirePool(),
      otherUserId,
    )

    await expect(
      getOwnedAssistantConversation(requirePool(), userId, conversation.id),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await expect(
      deleteAssistantConversation(requirePool(), userId, conversation.id),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })

    await requirePool().query('delete from app_users where id = $1', [
      otherUserId,
    ])
  })

  it('rejects an owner conversation as assistant history', async () => {
    const owner = await getOrCreateConversation(requirePool(), userId, 'owner')

    await expect(
      getOwnedAssistantConversation(requirePool(), userId, owner.id),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('deletes messages and revisions but keeps usage records', async () => {
    const conversation = await createAssistantConversation(
      requirePool(),
      userId,
    )
    const message = await createMessage(requirePool(), {
      conversationId: conversation.id,
      author: 'user',
      body: 'delete me',
      clientId: 'history-delete-0001',
    })
    await requirePool().query(
      `insert into message_revisions (message_id, body, edited_by_user_id)
       values ($1, 'old body', $2)`,
      [message.id, userId],
    )
    await requirePool().query(
      `insert into ai_usage (user_id, day, requests) values ($1, current_date, 3)`,
      [userId],
    )
    await requirePool().query(
      `insert into rate_limit_events (user_id, action) values ($1, 'assistant_send')`,
      [userId],
    )

    await deleteAssistantConversation(requirePool(), userId, conversation.id)

    const counts = await requirePool().query<{
      conversations: number
      messages: number
      revisions: number
      usage: number
      limits: number
    }>(
      `select
         (select count(*)::int from conversations where id = $1) as conversations,
         (select count(*)::int from messages where conversation_id = $1) as messages,
         (select count(*)::int from message_revisions where message_id = $2) as revisions,
         (select count(*)::int from ai_usage where user_id = $3) as usage,
         (select count(*)::int from rate_limit_events where user_id = $3) as limits`,
      [conversation.id, message.id, userId],
    )

    expect(counts.rows[0]).toEqual({
      conversations: 0,
      messages: 0,
      revisions: 0,
      usage: 1,
      limits: 1,
    })
  })
})
