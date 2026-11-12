import { Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { z } from 'zod'
import {
  assistantHistoryQuerySchema,
  assistantMessagesQuerySchema,
  chatKindSchema,
  editMessageSchema,
  ownerRetrySchema,
  paginationSchema,
  sendMessageSchema,
  threadPaginationSchema,
} from '../src/lib/chat/protocol'
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
  getLatestAssistantConversation,
  getOwnedAssistantConversation,
  listAssistantConversations,
} from './chat/history'
import {
  createOwnerReply,
  getOwnerThreadMessages,
  listOwnerThreads,
  markOwnerRead,
  markOwnerUnread,
  markUserOwnerUnread,
} from './chat/inbox'
import { consumeUserRateLimit } from './chat/rate-limit'
import { assertAiEligible, assertAllowedRateLimit, assertOwner } from './http/guards'
import { resolveAppUser } from './chat/users'
import { parseBody } from './chat/validation'
import { healthRouter } from './routes/health'
import { meRouter } from './routes/me'
import { assistantRouter } from './routes/assistant'

const app = new Hono()

app.route('/', healthRouter)
app.route('/', meRouter)
app.route('/', assistantRouter)

app.use('*', async (context, next) => {
  for (const [key, value] of getCorsHeaders(context.req.raw)) {
    context.header(key, value)
  }

  if (context.req.method === 'OPTIONS') {
    return context.body(null, 204)
  }

  await next()
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
  const { user, aiEligible, aiReason } = await resolveAppUser(pool, authUserId)
  assertAiEligible({ aiEligible, aiReason })
  const page = await listAssistantConversations(pool, user.id, query)
  return context.json(page)
})

app.get('/api/conversations/:kind/messages', async (context) => {
  const { authUserId } = await requireAuth(context.req.raw)
  const kind = chatKindSchema.parse(context.req.param('kind'))
  const pool = getPool()
  const { user, aiEligible, aiReason } = await resolveAppUser(pool, authUserId)

  if (kind === 'assistant') {
    assertAiEligible({ aiEligible, aiReason })
    const conversationId = context.req.query('conversationId')
    const pagination = paginationSchema.parse({
      limit: context.req.query('limit'),
      before: context.req.query('before'),
    })

    if (!conversationId) {
      // Rolling deploy: older clients read the assistant thread without an id.
      const latest = await getLatestAssistantConversation(pool, user.id)
      if (!latest) {
        return context.json({
          messages: [],
          hasMore: false,
          nextCursor: null,
        })
      }
      const page = await listMessages(pool, latest.id, {
        beforeSeq: pagination.before,
        limit: pagination.limit,
      })
      return context.json(page)
    }

    const query = assistantMessagesQuerySchema.parse({
      limit: context.req.query('limit'),
      before: context.req.query('before'),
      conversationId,
    })
    const conversation = await getOwnedAssistantConversation(pool, user.id, query.conversationId)
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
  const { user, aiEligible, aiReason } = await resolveAppUser(pool, authUserId)
  assertAiEligible({ aiEligible, aiReason })
  const conversationId = z.string().uuid().parse(context.req.param('id'))
  await deleteAssistantConversation(pool, user.id, conversationId)
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

app.route('/', assistantRouter)

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
  return context.json(apiError.toJSON(), apiError.status as ContentfulStatusCode)
})

export default app
