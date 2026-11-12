import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  beginAssistantEdit,
  beginAssistantRetry,
  beginAssistantTurn,
  runAssistantTurn,
} from '../chat/ai'
import { createMessage, getOrCreateConversation } from '../chat/conversations'
import type { OpenRouterGateway } from '../chat/openrouter'

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
  const authUserId = `test-ai-${randomUUID()}`
  const githubId = String(3_000_000_000 + Math.floor(Math.random() * 700_000_000))
  const { rows } = await requirePool().query<{ id: string }>(
    `insert into app_users (auth_user_id, github_id, github_login, github_created_at, github_checked_at)
     values ($1, $2, 'test-ai', now() - interval '2 years', now())
     returning id`,
    [authUserId, githubId],
  )
  const row = rows[0]
  if (!row) {
    throw new Error('Could not create test user')
  }
  return row.id
}

function gateway(chunks: string[], outputTokens = 7): OpenRouterGateway {
  return {
    async *stream() {
      for (const text of chunks) {
        yield { text }
      }
      yield { text: '', outputTokens }
    },
  }
}

describe.skipIf(!hasDatabase)('assistant turns', () => {
  beforeAll(async () => {
    await requirePool().query('select 1')
  })

  beforeEach(async () => {
    userId = await createTestUser()
    const conversation = await getOrCreateConversation(requirePool(), userId, 'assistant')
    conversationId = conversation.id
  })

  afterEach(async () => {
    await requirePool().query('delete from app_users where id = $1', [userId])
  })

  afterAll(async () => {
    await requirePool().end()
  })

  it('persists a completed assistant reply', async () => {
    const turn = await beginAssistantTurn(requirePool(), {
      userId,
      body: 'hello',
      clientId: 'client-ai-0001',
    })
    const deltas: string[] = []

    const result = await runAssistantTurn({
      pool: requirePool(),
      assistantMessageId: turn.assistantMessage.id,
      context: turn.context,
      gateway: gateway(['Hello', ' world']),
      onDelta: (text) => {
        deltas.push(text)
      },
    })

    expect(result.status).toBe('complete')
    expect(result.body).toBe('Hello world')
    expect(deltas.join('')).toBe('Hello world')

    const { rows } = await requirePool().query(
      'select body, status, output_tokens from messages where id = $1',
      [turn.assistantMessage.id],
    )
    expect(rows[0]).toMatchObject({
      body: 'Hello world',
      status: 'complete',
      output_tokens: 7,
    })
  })

  it('persists a failed turn without leaving a streaming row', async () => {
    const turn = await beginAssistantTurn(requirePool(), {
      userId,
      body: 'hello',
      clientId: 'client-ai-0002',
    })
    const failing: OpenRouterGateway = {
      async *stream() {
        yield { text: 'partial' }
        throw new Error('provider down')
      },
    }

    const result = await runAssistantTurn({
      pool: requirePool(),
      assistantMessageId: turn.assistantMessage.id,
      context: turn.context,
      gateway: failing,
      onDelta: () => {},
    })

    expect(result.status).toBe('failed')
    const { rows } = await requirePool().query(
      'select body, status, error_code from messages where id = $1',
      [turn.assistantMessage.id],
    )
    expect(rows[0]).toMatchObject({
      body: 'partial',
      status: 'failed',
      error_code: 'UPSTREAM_ERROR',
    })
  })

  it('persists an aborted turn as failed', async () => {
    const turn = await beginAssistantTurn(requirePool(), {
      userId,
      body: 'hello',
      clientId: 'client-ai-0003',
    })
    const controller = new AbortController()
    const aborting: OpenRouterGateway = {
      async *stream() {
        yield { text: 'partial' }
        controller.abort()
        yield { text: 'after' }
      },
    }

    const result = await runAssistantTurn({
      pool: requirePool(),
      assistantMessageId: turn.assistantMessage.id,
      context: turn.context,
      gateway: aborting,
      signal: controller.signal,
      onDelta: () => {},
    })

    expect(result.status).toBe('failed')
    const { rows } = await requirePool().query(
      'select body, status, error_code from messages where id = $1',
      [turn.assistantMessage.id],
    )
    expect(rows[0]).toMatchObject({
      body: 'partial',
      status: 'failed',
      error_code: 'ABORTED',
    })
  })

  it('caps output at 6000 characters', async () => {
    const turn = await beginAssistantTurn(requirePool(), {
      userId,
      body: 'hello',
      clientId: 'client-ai-0004',
    })
    const long = gateway(Array.from({ length: 100 }, () => 'x'.repeat(100)))

    const result = await runAssistantTurn({
      pool: requirePool(),
      assistantMessageId: turn.assistantMessage.id,
      context: turn.context,
      gateway: long,
      onDelta: () => {},
    })

    expect(result.truncated).toBe(true)
    expect(result.body).toHaveLength(6000)
  })

  it('forks from an edited prompt and hides later messages', async () => {
    const first = await createMessage(requirePool(), {
      conversationId,
      author: 'user',
      body: 'first question',
      clientId: 'client-ai-0005',
    })
    const laterAssistant = await createMessage(requirePool(), {
      conversationId,
      author: 'assistant',
      body: 'later answer',
      status: 'complete',
    })

    const edit = await beginAssistantEdit(requirePool(), {
      userId,
      messageId: first.id,
      body: 'edited question',
    })

    expect(edit.userMessage.body).toBe('edited question')
    const { rows } = await requirePool().query(
      'select status, deleted_at from messages where id = $1',
      [laterAssistant.id],
    )
    expect(rows[0]?.status).toBe('superseded')
    expect(rows[0]?.deleted_at).not.toBeNull()

    const revisions = await requirePool().query(
      'select body from message_revisions where message_id = $1',
      [first.id],
    )
    expect(revisions.rows).toEqual([{ body: 'first question' }])
  })

  it('rejects editing another user assistant message', async () => {
    const message = await createMessage(requirePool(), {
      conversationId,
      author: 'user',
      body: 'mine',
      clientId: 'client-ai-0006',
    })
    const otherUserId = await createTestUser()

    await expect(
      beginAssistantEdit(requirePool(), {
        userId: otherUserId,
        messageId: message.id,
        body: 'stolen',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })

    await requirePool().query('delete from app_users where id = $1', [otherUserId])
  })

  it('retries a failed assistant message', async () => {
    const userMessage = await createMessage(requirePool(), {
      conversationId,
      author: 'user',
      body: 'retry me',
      clientId: 'client-ai-0007',
    })
    const failed = await createMessage(requirePool(), {
      conversationId,
      author: 'assistant',
      body: 'broken',
      status: 'failed',
      replyToId: userMessage.id,
      errorCode: 'UPSTREAM_ERROR',
    })

    const retry = await beginAssistantRetry(requirePool(), {
      userId,
      assistantMessageId: failed.id,
    })

    expect(retry.assistantMessage.id).not.toBe(failed.id)
    const { rows } = await requirePool().query('select status from messages where id = $1', [
      failed.id,
    ])
    expect(rows[0]?.status).toBe('superseded')
  })

  it('creates a new conversation and title when no id is given', async () => {
    const turn = await beginAssistantTurn(requirePool(), {
      userId,
      body: '  first   chat question  ',
      clientId: 'client-ai-0008',
    })

    expect(turn.conversationId).not.toBe(conversationId)
    await expect(conversationTitle(turn.conversationId)).resolves.toBe('first chat question')
  })

  it('reuses an owned conversation', async () => {
    const turn = await beginAssistantTurn(requirePool(), {
      userId,
      body: 'reuse me',
      clientId: 'client-ai-0009',
      conversationId,
    })

    expect(turn.conversationId).toBe(conversationId)
  })

  it('rejects a conversation owned by another user', async () => {
    const otherUserId = await createTestUser()
    const otherConversation = await getOrCreateConversation(requirePool(), otherUserId, 'assistant')

    await expect(
      beginAssistantTurn(requirePool(), {
        userId,
        body: 'stolen',
        clientId: 'client-ai-0010',
        conversationId: otherConversation.id,
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })

    await requirePool().query('delete from app_users where id = $1', [otherUserId])
  })

  it('rejects an owner conversation', async () => {
    const owner = await getOrCreateConversation(requirePool(), userId, 'owner')

    await expect(
      beginAssistantTurn(requirePool(), {
        userId,
        body: 'wrong kind',
        clientId: 'client-ai-0011',
        conversationId: owner.id,
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('retitles when the earliest user message is edited', async () => {
    const turn = await beginAssistantTurn(requirePool(), {
      userId,
      body: 'first question',
      clientId: 'client-ai-0012',
      conversationId,
    })

    await beginAssistantEdit(requirePool(), {
      userId,
      messageId: turn.userMessage.id,
      body: 'edited first question',
    })

    await expect(conversationTitle(conversationId)).resolves.toBe('edited first question')
  })

  it('does not retitle when a later user message is edited', async () => {
    const first = await beginAssistantTurn(requirePool(), {
      userId,
      body: 'first question',
      clientId: 'client-ai-0013',
      conversationId,
    })
    const later = await beginAssistantTurn(requirePool(), {
      userId,
      body: 'later question',
      clientId: 'client-ai-0014',
      conversationId,
    })
    expect(first.conversationId).toBe(conversationId)

    await beginAssistantEdit(requirePool(), {
      userId,
      messageId: later.userMessage.id,
      body: 'edited later question',
    })

    await expect(conversationTitle(conversationId)).resolves.toBe('first question')
  })

  it('does not retitle on retry', async () => {
    const turn = await beginAssistantTurn(requirePool(), {
      userId,
      body: 'retry title',
      clientId: 'client-ai-0015',
      conversationId,
    })
    await requirePool().query(
      `update messages set status = 'failed', body = 'broken' where id = $1`,
      [turn.assistantMessage.id],
    )

    await beginAssistantRetry(requirePool(), {
      userId,
      assistantMessageId: turn.assistantMessage.id,
    })

    await expect(conversationTitle(conversationId)).resolves.toBe('retry title')
  })
})

async function conversationTitle(conversationId: string): Promise<string | null> {
  const { rows } = await requirePool().query<{ title: string | null }>(
    'select title from conversations where id = $1',
    [conversationId],
  )
  return rows[0]?.title ?? null
}
