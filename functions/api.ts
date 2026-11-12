import type { Context } from 'hono'
import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import {
  assistantEditSchema,
  assistantHistoryQuerySchema,
  assistantMessagesQuerySchema,
  assistantRetrySchema,
  assistantSendSchema,
  chatKindSchema,
  editMessageSchema,
  ownerRetrySchema,
  paginationSchema,
  sendMessageSchema,
  threadPaginationSchema,
} from '../src/lib/chat/protocol'
import {
  type AssistantTurn,
  beginAssistantEdit,
  beginAssistantRetry,
  beginAssistantTurn,
  markAssistantFailed,
  runAssistantTurn,
} from './chat/ai'
import { requireAuth } from './chat/auth'
import {
  createMessage,
  editMessage,
  getOrCreateConversation,
  listMessages,
  markRead,
} from './chat/conversations'
import { getCorsHeaders } from './chat/cors'
import { getPool } from './chat/db'
import { ApiError, toApiError } from './chat/errors'
import {
  deleteAssistantConversation,
  getOwnedAssistantConversation,
  listAssistantConversations,
} from './chat/history'
import {
  countUserOwnerUnread,
  createOwnerReply,
  getOwnerThreadMessages,
  listOwnerThreads,
  markOwnerRead,
  markOwnerUnread,
  markUserOwnerUnread,
} from './chat/inbox'
import {
  createOpenRouterGateway,
  type OpenRouterGateway,
} from './chat/openrouter'
import {
  consumeGlobalAiLimit,
  consumeUserRateLimit,
  type RateLimitResult,
} from './chat/rate-limit'
import { resolveAppUser } from './chat/users'
import { parseBody } from './chat/validation'

const app = new Hono()

function assertAllowedRateLimit(
  context: Context,
  result: RateLimitResult,
): void {
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

function assertAiEligible(input: {
  aiEligible: boolean
  aiReason: string
}): void {
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

function assertOwner(isOwner: boolean): void {
  if (!isOwner) {
    throw new ApiError('FORBIDDEN', 'Owner access only', 403)
  }
}

async function assertAiRateLimits(
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

async function streamTurn(
  context: Context,
  pool: ReturnType<typeof getPool>,
  turn: AssistantTurn,
  gateway: OpenRouterGateway,
): Promise<Response> {
  return streamSSE(context, async (stream) => {
    const controller = new AbortController()
    const heartbeat = setInterval(() => {
      void stream.write(': ping\n\n').catch(() => {})
    }, 15_000)

    stream.onAbort(() => controller.abort())

    try {
      await stream.writeSSE({
        event: 'meta',
        data: JSON.stringify({
          conversationId: turn.conversationId,
          userMessageId: turn.userMessage.id,
          assistantMessageId: turn.assistantMessage.id,
        }),
      })

      const result = await runAssistantTurn({
        pool,
        assistantMessageId: turn.assistantMessage.id,
        context: turn.context,
        gateway,
        signal: controller.signal,
        onDelta: async (text) => {
          await stream.writeSSE({
            event: 'delta',
            data: JSON.stringify({ text }),
          })
        },
      })

      if (result.status === 'complete') {
        await stream.writeSSE({
          event: 'done',
          data: JSON.stringify({
            assistantMessageId: turn.assistantMessage.id,
            finishReason: result.finishReason,
            truncated: result.truncated,
            outputTokens: result.outputTokens,
          }),
        })
      } else {
        await stream.writeSSE({
          event: 'error',
          data: JSON.stringify({
            code: result.errorCode ?? 'UPSTREAM_ERROR',
            message:
              result.errorCode === 'ABORTED'
                ? 'Response stopped.'
                : 'The assistant is temporarily unavailable.',
            retryable: true,
          }),
        })
      }
    } catch (error) {
      console.error('[sse] stream failed', error)
      await markAssistantFailed(pool, turn.assistantMessage.id)
      await stream
        .writeSSE({
          event: 'error',
          data: JSON.stringify({
            code: 'UPSTREAM_ERROR',
            message: 'The assistant is temporarily unavailable.',
            retryable: true,
          }),
        })
        .catch(() => {})
    } finally {
      clearInterval(heartbeat)
    }
  })
}

app.use('*', async (context, next) => {
  for (const [key, value] of getCorsHeaders(context.req.raw)) {
    context.header(key, value)
  }

  if (context.req.method === 'OPTIONS') {
    return context.body(null, 204)
  }

  await next()
})

app.get('/api/health', (context) => context.json({ ok: true }))

app.get('/api/me', async (context) => {
  const { authUserId } = await requireAuth(context.req.raw)
  const pool = getPool()
  const { user, isOwner, aiEligible, aiReason } = await resolveAppUser(
    pool,
    authUserId,
  )
  const ownerUnreadCount = await countUserOwnerUnread(pool, user.id)

  return context.json({
    user: {
      id: user.id,
      githubLogin: user.githubLogin,
      githubCreatedAt: user.githubCreatedAt?.toISOString() ?? null,
      role: user.role,
    },
    isOwner,
    aiEligible,
    aiReason,
    ownerUnreadCount,
  })
})

app.post('/api/chat/owner', async (context) => {
  const { authUserId } = await requireAuth(context.req.raw)
  const input = await parseBody(sendMessageSchema, context.req.raw)
  const pool = getPool()
  const { user } = await resolveAppUser(pool, authUserId)
  assertAllowedRateLimit(
    context,
    await consumeUserRateLimit(pool, {
      userId: user.id,
      action: 'owner_send',
      perMinute: 10,
      perDay: 60,
    }),
  )
  const conversation = await getOrCreateConversation(pool, user.id, 'owner')
  const message = await createMessage(pool, {
    conversationId: conversation.id,
    author: 'user',
    body: input.body,
    clientId: input.clientId,
  })

  return context.json({ message })
})

app.post('/api/chat/owner/retry', async (context) => {
  const { authUserId } = await requireAuth(context.req.raw)
  const input = await parseBody(ownerRetrySchema, context.req.raw)
  const pool = getPool()
  const { user } = await resolveAppUser(pool, authUserId)
  assertAllowedRateLimit(
    context,
    await consumeUserRateLimit(pool, {
      userId: user.id,
      action: 'owner_send',
      perMinute: 10,
      perDay: 60,
    }),
  )
  const conversation = await getOrCreateConversation(pool, user.id, 'owner')
  const message = await createMessage(pool, {
    conversationId: conversation.id,
    author: 'user',
    body: input.body,
    clientId: input.clientId,
  })

  return context.json({ message })
})

app.get('/api/conversations/assistant', async (context) => {
  const { authUserId } = await requireAuth(context.req.raw)
  const query = assistantHistoryQuerySchema.parse({
    limit: context.req.query('limit'),
    before: context.req.query('before'),
  })
  const pool = getPool()
  const { user } = await resolveAppUser(pool, authUserId)
  const page = await listAssistantConversations(pool, user.id, query)
  return context.json(page)
})

app.get('/api/conversations/:kind/messages', async (context) => {
  const { authUserId } = await requireAuth(context.req.raw)
  const kind = chatKindSchema.parse(context.req.param('kind'))
  const pool = getPool()
  const { user } = await resolveAppUser(pool, authUserId)

  if (kind === 'assistant') {
    const query = assistantMessagesQuerySchema.parse({
      limit: context.req.query('limit'),
      before: context.req.query('before'),
      conversationId: context.req.query('conversationId'),
    })
    const conversation = await getOwnedAssistantConversation(
      pool,
      user.id,
      query.conversationId,
    )
    const page = await listMessages(pool, conversation.id, {
      beforeSeq: query.before,
      limit: query.limit,
    })
    return context.json(page)
  }

  const query = paginationSchema.parse({
    limit: context.req.query('limit'),
    before: context.req.query('before'),
  })
  const conversation = await getOrCreateConversation(pool, user.id, kind)
  const page = await listMessages(pool, conversation.id, {
    beforeSeq: query.before,
    limit: query.limit,
  })

  return context.json(page)
})

app.delete('/api/conversations/:id', async (context) => {
  const { authUserId } = await requireAuth(context.req.raw)
  const pool = getPool()
  const { user } = await resolveAppUser(pool, authUserId)
  await deleteAssistantConversation(
    pool,
    user.id,
    context.req.param('id'),
  )
  return context.json({ ok: true })
})

app.get('/api/owner/threads', async (context) => {
  const { authUserId } = await requireAuth(context.req.raw)
  const pool = getPool()
  const { isOwner } = await resolveAppUser(pool, authUserId)
  assertOwner(isOwner)
  const query = threadPaginationSchema.parse({
    limit: context.req.query('limit'),
    before: context.req.query('before'),
  })
  const page = await listOwnerThreads(pool, query)
  return context.json(page)
})

app.get('/api/owner/threads/:userId/messages', async (context) => {
  const { authUserId } = await requireAuth(context.req.raw)
  const pool = getPool()
  const { isOwner } = await resolveAppUser(pool, authUserId)
  assertOwner(isOwner)
  const query = paginationSchema.parse({
    limit: context.req.query('limit'),
    before: context.req.query('before'),
  })
  const page = await getOwnerThreadMessages(pool, context.req.param('userId'), {
    beforeSeq: query.before,
    limit: query.limit,
  })
  return context.json(page)
})

app.post('/api/owner/threads/:userId/messages', async (context) => {
  const { authUserId } = await requireAuth(context.req.raw)
  const input = await parseBody(sendMessageSchema, context.req.raw)
  const pool = getPool()
  const { user, isOwner } = await resolveAppUser(pool, authUserId)
  assertOwner(isOwner)
  assertAllowedRateLimit(
    context,
    await consumeUserRateLimit(pool, {
      userId: user.id,
      action: 'owner_send',
      perMinute: 10,
      perDay: 60,
    }),
  )
  const message = await createOwnerReply(pool, {
    visitorUserId: context.req.param('userId'),
    body: input.body,
    clientId: input.clientId,
  })
  return context.json({ message })
})

app.post('/api/owner/threads/:userId/read', async (context) => {
  const { authUserId } = await requireAuth(context.req.raw)
  const pool = getPool()
  const { isOwner } = await resolveAppUser(pool, authUserId)
  assertOwner(isOwner)
  await markOwnerRead(pool, context.req.param('userId'))
  return context.json({ ok: true })
})

app.post('/api/owner/threads/:userId/unread', async (context) => {
  const { authUserId } = await requireAuth(context.req.raw)
  const pool = getPool()
  const { isOwner } = await resolveAppUser(pool, authUserId)
  assertOwner(isOwner)
  await markOwnerUnread(pool, context.req.param('userId'))
  return context.json({ ok: true })
})

app.post('/api/chat/assistant', async (context) => {
  const { authUserId } = await requireAuth(context.req.raw)
  const input = await parseBody(assistantSendSchema, context.req.raw)
  const pool = getPool()
  const { user, aiEligible, aiReason } = await resolveAppUser(pool, authUserId)
  assertAiEligible({ aiEligible, aiReason })
  await assertAiRateLimits(context, pool, user.id)

  const gateway = createOpenRouterGateway()
  const turn = await beginAssistantTurn(pool, {
    userId: user.id,
    body: input.body,
    clientId: input.clientId,
    conversationId: input.conversationId,
  })

  return streamTurn(context, pool, turn, gateway)
})

app.post('/api/chat/assistant/edit', async (context) => {
  const { authUserId } = await requireAuth(context.req.raw)
  const input = await parseBody(assistantEditSchema, context.req.raw)
  const pool = getPool()
  const { user, aiEligible, aiReason } = await resolveAppUser(pool, authUserId)
  assertAiEligible({ aiEligible, aiReason })
  await assertAiRateLimits(context, pool, user.id)

  const gateway = createOpenRouterGateway()
  const turn = await beginAssistantEdit(pool, {
    userId: user.id,
    messageId: input.messageId,
    body: input.body,
  })

  return streamTurn(context, pool, turn, gateway)
})

app.post('/api/chat/assistant/retry', async (context) => {
  const { authUserId } = await requireAuth(context.req.raw)
  const input = await parseBody(assistantRetrySchema, context.req.raw)
  const pool = getPool()
  const { user, aiEligible, aiReason } = await resolveAppUser(pool, authUserId)
  assertAiEligible({ aiEligible, aiReason })
  await assertAiRateLimits(context, pool, user.id)

  const gateway = createOpenRouterGateway()
  const turn = await beginAssistantRetry(pool, {
    userId: user.id,
    assistantMessageId: input.assistantMessageId,
  })

  return streamTurn(context, pool, turn, gateway)
})

app.patch('/api/messages/:id', async (context) => {
  const { authUserId } = await requireAuth(context.req.raw)
  const input = await parseBody(editMessageSchema, context.req.raw)
  const pool = getPool()
  const { user, isOwner } = await resolveAppUser(pool, authUserId)
  assertAllowedRateLimit(
    context,
    await consumeUserRateLimit(pool, {
      userId: user.id,
      action: 'edit',
      perMinute: 10,
      perDay: 60,
    }),
  )
  const message = await editMessage(pool, {
    messageId: context.req.param('id'),
    userId: user.id,
    body: input.body,
    allowOwner: isOwner,
  })

  return context.json({ message })
})

app.post('/api/conversations/owner/read', async (context) => {
  const { authUserId } = await requireAuth(context.req.raw)
  const pool = getPool()
  const { user } = await resolveAppUser(pool, authUserId)
  const conversation = await getOrCreateConversation(pool, user.id, 'owner')
  await markRead(pool, conversation.id, 'user')
  return context.json({ ok: true })
})

app.post('/api/conversations/owner/unread', async (context) => {
  const { authUserId } = await requireAuth(context.req.raw)
  const pool = getPool()
  const { user } = await resolveAppUser(pool, authUserId)
  await markUserOwnerUnread(pool, user.id)
  return context.json({ ok: true })
})

app.post('/api/conversations/:id/read', async (context) => {
  const { authUserId } = await requireAuth(context.req.raw)
  const pool = getPool()
  const { user } = await resolveAppUser(pool, authUserId)
  const { rows } = await pool.query<{ id: string }>(
    'select id from conversations where id = $1 and user_id = $2',
    [context.req.param('id'), user.id],
  )

  if (!rows[0]) {
    throw new ApiError('NOT_FOUND', 'Conversation not found')
  }

  await markRead(pool, rows[0].id, 'user')
  return context.json({ ok: true })
})

app.onError((error, context) => {
  const apiError = toApiError(error)
  return context.json(
    apiError.toJSON(),
    apiError.status as ContentfulStatusCode,
  )
})

export default app
