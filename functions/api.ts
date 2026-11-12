import { Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import {
  chatKindSchema,
  editMessageSchema,
  ownerRetrySchema,
  paginationSchema,
  sendMessageSchema,
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
import { resolveAppUser } from './chat/users'
import { parseBody } from './chat/validation'

const app = new Hono()

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
  const { user, isOwner, aiEligible, aiReason } = await resolveAppUser(
    getPool(),
    authUserId,
  )

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
  })
})

app.post('/api/chat/owner', async (context) => {
  const { authUserId } = await requireAuth(context.req.raw)
  const input = await parseBody(sendMessageSchema, context.req.raw)
  const pool = getPool()
  const { user } = await resolveAppUser(pool, authUserId)
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
  const conversation = await getOrCreateConversation(pool, user.id, 'owner')
  const message = await createMessage(pool, {
    conversationId: conversation.id,
    author: 'user',
    body: input.body,
    clientId: input.clientId,
  })

  return context.json({ message })
})

app.get('/api/conversations/:kind/messages', async (context) => {
  const { authUserId } = await requireAuth(context.req.raw)
  const kind = chatKindSchema.parse(context.req.param('kind'))
  const query = paginationSchema.parse({
    limit: context.req.query('limit'),
    before: context.req.query('before'),
  })
  const pool = getPool()
  const { user } = await resolveAppUser(pool, authUserId)
  const conversation = await getOrCreateConversation(pool, user.id, kind)
  const page = await listMessages(pool, conversation.id, {
    beforeSeq: query.before,
    limit: query.limit,
  })

  return context.json(page)
})

app.patch('/api/messages/:id', async (context) => {
  const { authUserId } = await requireAuth(context.req.raw)
  const input = await parseBody(editMessageSchema, context.req.raw)
  const pool = getPool()
  const { user } = await resolveAppUser(pool, authUserId)
  const message = await editMessage(pool, {
    messageId: context.req.param('id'),
    userId: user.id,
    body: input.body,
  })

  return context.json({ message })
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
