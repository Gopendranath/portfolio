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
  createOwnerReply,
  listOwnerThreads,
  markOwnerRead,
} from '../chat/inbox'

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL)
const pool = hasDatabase
  ? new Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 2 })
  : null

let visitorId = ''
let ownerId = ''

function requirePool(): Pool {
  if (!pool) {
    throw new Error('TEST_DATABASE_URL is required for this test')
  }
  return pool
}

async function createUser(role: 'user' | 'owner'): Promise<string> {
  const authUserId = `test-inbox-${randomUUID()}`
  const githubId = String(
    4_000_000_000 + Math.floor(Math.random() * 600_000_000),
  )
  const { rows } = await requirePool().query<{ id: string }>(
    `insert into app_users (auth_user_id, github_id, github_login, role)
     values ($1, $2, $3, $4)
     returning id`,
    [
      authUserId,
      githubId,
      role === 'owner' ? 'owner-test' : 'visitor-test',
      role,
    ],
  )
  const row = rows[0]
  if (!row) {
    throw new Error('Could not create test user')
  }
  return row.id
}

describe.skipIf(!hasDatabase)('owner inbox', () => {
  beforeAll(async () => {
    await requirePool().query(
      "delete from app_users where auth_user_id like 'test-inbox-%'",
    )
  })

  beforeEach(async () => {
    ownerId = await createUser('owner')
    visitorId = await createUser('user')
    const conversation = await getOrCreateConversation(
      requirePool(),
      visitorId,
      'owner',
    )
    await createMessage(requirePool(), {
      conversationId: conversation.id,
      author: 'user',
      body: 'hello owner',
      clientId: 'client-inbox-0001',
    })
  })

  afterEach(async () => {
    await requirePool().query(
      'delete from app_users where id = any($1::uuid[])',
      [[visitorId, ownerId]],
    )
  })

  afterAll(async () => {
    await requirePool().end()
  })

  it('lists owner threads only and counts unread visitor messages', async () => {
    const assistant = await getOrCreateConversation(
      requirePool(),
      visitorId,
      'assistant',
    )
    await createMessage(requirePool(), {
      conversationId: assistant.id,
      author: 'user',
      body: 'private ai message',
      clientId: 'client-inbox-0002',
    })

    const page = await listOwnerThreads(requirePool(), { limit: 20 })
    expect(page.threads).toHaveLength(1)
    expect(page.threads[0]?.userId).toBe(visitorId)
    expect(page.threads[0]?.lastMessage).toBe('hello owner')
    expect(page.threads[0]?.unreadCount).toBe(1)
  })

  it('clears owner unread after reading', async () => {
    await markOwnerRead(requirePool(), visitorId)
    const page = await listOwnerThreads(requirePool(), { limit: 20 })
    expect(page.threads[0]?.unreadCount).toBe(0)
  })

  it('creates an owner reply and updates the thread preview', async () => {
    const reply = await createOwnerReply(requirePool(), {
      visitorUserId: visitorId,
      body: 'thanks for reaching out',
      clientId: 'owner-reply-0001',
    })

    expect(reply.author).toBe('owner')
    const page = await listOwnerThreads(requirePool(), { limit: 20 })
    expect(page.threads[0]?.lastMessage).toBe('thanks for reaching out')
  })

  it('rejects an owner reply on a missing thread', async () => {
    await expect(
      createOwnerReply(requirePool(), {
        visitorUserId: randomUUID(),
        body: 'hello',
        clientId: 'owner-reply-0002',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('paginates owner threads', async () => {
    const secondVisitor = await createUser('user')
    const second = await getOrCreateConversation(
      requirePool(),
      secondVisitor,
      'owner',
    )
    await createMessage(requirePool(), {
      conversationId: second.id,
      author: 'user',
      body: 'second visitor',
      clientId: 'client-inbox-0003',
    })

    const first = await listOwnerThreads(requirePool(), { limit: 1 })
    expect(first.hasMore).toBe(true)
    expect(first.nextCursor).toBeTruthy()

    const next = await listOwnerThreads(requirePool(), {
      limit: 1,
      before: first.nextCursor ?? undefined,
    })
    expect(next.threads).toHaveLength(1)
    expect(next.threads[0]?.userId).not.toBe(first.threads[0]?.userId)

    await requirePool().query('delete from app_users where id = $1', [
      secondVisitor,
    ])
  })
})
