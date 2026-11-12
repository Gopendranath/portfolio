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
  createMessage,
  editMessage,
  getOrCreateConversation,
  listMessages,
  markRead,
  markUnread,
} from '../chat/conversations'

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL)
const pool = hasDatabase
  ? new Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 2 })
  : null

let userId = ''
let conversationId = ''

function requirePool(): Pool {
  if (!pool) {
    throw new Error('TEST_DATABASE_URL is required for this test')
  }
  return pool
}

async function createTestUser(): Promise<string> {
  const authUserId = `test-${randomUUID()}`
  const githubId = String(
    1_000_000_000 + Math.floor(Math.random() * 800_000_000),
  )
  const { rows } = await requirePool().query<{ id: string }>(
    `insert into app_users (auth_user_id, github_id, github_login, github_created_at, github_checked_at)
     values ($1, $2, 'test-user', now() - interval '2 years', now())
     returning id`,
    [authUserId, githubId],
  )
  const row = rows[0]
  if (!row) {
    throw new Error('Could not create test user')
  }
  return row.id
}

describe.skipIf(!hasDatabase)('conversation helpers', () => {
  beforeAll(async () => {
    await requirePool().query(
      "delete from app_users where auth_user_id like 'test-%' and auth_user_id not like 'test-ai-%' and auth_user_id not like 'test-inbox-%' and auth_user_id not like 'test-rate-%'",
    )
  })

  beforeEach(async () => {
    userId = await createTestUser()
    const conversation = await getOrCreateConversation(
      requirePool(),
      userId,
      'owner',
    )
    conversationId = conversation.id
  })

  afterEach(async () => {
    await requirePool().query('delete from app_users where id = $1', [userId])
  })

  afterAll(async () => {
    await requirePool().end()
  })

  it('reuses one conversation per user and kind', async () => {
    const first = await getOrCreateConversation(requirePool(), userId, 'owner')
    const second = await getOrCreateConversation(requirePool(), userId, 'owner')
    expect(second.id).toBe(first.id)
  })

  it('creates a message idempotently by client id', async () => {
    const input = {
      conversationId,
      author: 'user' as const,
      body: 'hello',
      clientId: 'client-test-0001',
    }
    const first = await createMessage(requirePool(), input)
    const second = await createMessage(requirePool(), {
      ...input,
      body: 'different',
    })

    expect(second.id).toBe(first.id)
    const { rows } = await requirePool().query(
      'select count(*)::int as count from messages where conversation_id = $1',
      [conversationId],
    )
    expect(rows[0]?.count).toBe(1)
  })

  it('paginates newest ten and walks backwards', async () => {
    for (let index = 1; index <= 25; index += 1) {
      await createMessage(requirePool(), {
        conversationId,
        author: 'user',
        body: `message ${index}`,
        clientId: `client-page-${index}`,
      })
    }

    const first = await listMessages(requirePool(), conversationId, {
      limit: 10,
    })
    expect(first.messages.map((message) => message.body)).toEqual(
      Array.from({ length: 10 }, (_, index) => `message ${index + 16}`),
    )
    expect(first.hasMore).toBe(true)
    expect(first.nextCursor).toBe(first.messages[0]?.seq)

    const second = await listMessages(requirePool(), conversationId, {
      limit: 10,
      beforeSeq: first.nextCursor ?? undefined,
    })
    expect(second.messages.map((message) => message.body)).toEqual(
      Array.from({ length: 10 }, (_, index) => `message ${index + 6}`),
    )
    expect(second.hasMore).toBe(true)

    const third = await listMessages(requirePool(), conversationId, {
      limit: 10,
      beforeSeq: second.nextCursor ?? undefined,
    })
    expect(third.messages.map((message) => message.body)).toEqual(
      Array.from({ length: 5 }, (_, index) => `message ${index + 1}`),
    )
    expect(third.hasMore).toBe(false)
  })

  it('hides deleted and superseded messages', async () => {
    const message = await createMessage(requirePool(), {
      conversationId,
      author: 'user',
      body: 'hide me',
      clientId: 'client-hide-0001',
    })
    await requirePool().query(
      "update messages set status = 'superseded', deleted_at = now() where id = $1",
      [message.id],
    )

    const page = await listMessages(requirePool(), conversationId, {
      limit: 10,
    })
    expect(page.messages).toHaveLength(0)
  })

  it('marks stale streaming messages as failed on read', async () => {
    const message = await createMessage(requirePool(), {
      conversationId,
      author: 'assistant',
      body: '',
      status: 'streaming',
      clientId: 'client-stale-0001',
    })
    await requirePool().query(
      "update messages set created_at = now() - interval '3 minutes' where id = $1",
      [message.id],
    )

    const page = await listMessages(requirePool(), conversationId, {
      limit: 10,
    })
    expect(
      page.messages.find((candidate) => candidate.id === message.id),
    ).toMatchObject({ status: 'failed', errorCode: 'STALE_STREAM' })
  })

  it('edits an own owner-thread message and keeps a revision', async () => {
    const message = await createMessage(requirePool(), {
      conversationId,
      author: 'user',
      body: 'original',
      clientId: 'client-edit-0001',
    })

    const edited = await editMessage(requirePool(), {
      messageId: message.id,
      userId,
      body: 'edited',
    })

    expect(edited.body).toBe('edited')
    expect(edited.editedAt).not.toBeNull()

    const revisions = await requirePool().query(
      'select body from message_revisions where message_id = $1',
      [message.id],
    )
    expect(revisions.rows).toEqual([{ body: 'original' }])
  })

  it('rejects edits from another user', async () => {
    const message = await createMessage(requirePool(), {
      conversationId,
      author: 'user',
      body: 'mine',
      clientId: 'client-edit-0002',
    })
    const otherUserId = await createTestUser()

    await expect(
      editMessage(requirePool(), {
        messageId: message.id,
        userId: otherUserId,
        body: 'stolen',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })

    await requirePool().query('delete from app_users where id = $1', [
      otherUserId,
    ])
  })

  it('marks the user side read', async () => {
    await markRead(requirePool(), conversationId, 'user')
    const { rows } = await requirePool().query(
      'select user_last_read_at from conversations where id = $1',
      [conversationId],
    )
    expect(rows[0]?.user_last_read_at).not.toBeNull()
  })

  it('marks the latest incoming message unread', async () => {
    const message = await createMessage(requirePool(), {
      conversationId,
      author: 'owner',
      body: 'read this again',
      clientId: 'client-unread-0001',
    })
    await markRead(requirePool(), conversationId, 'user')
    await markUnread(requirePool(), conversationId, 'user')

    const { rows } = await requirePool().query<{ is_before: boolean }>(
      `select user_last_read_at < (
         select created_at from messages where id = $2
       ) as is_before
         from conversations where id = $1`,
      [conversationId, message.id],
    )

    expect(rows[0]?.is_before).toBe(true)
  })
})
