import { Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import {
  paginationSchema,
  sendMessageSchema,
  threadPaginationSchema,
} from '../src/lib/chat/protocol'
import { requireAuth } from './chat/auth'
import { getCorsHeaders } from './chat/cors'
import { getPool } from './chat/db'
import { toApiError } from './chat/errors'
import {
  createOwnerReply,
  getOwnerThreadMessages,
  listOwnerThreads,
  markOwnerRead,
  markOwnerUnread,
} from './chat/inbox'
import { consumeUserRateLimit } from './chat/rate-limit'
import { assertAllowedRateLimit, assertOwner } from './http/guards'
import { resolveAppUser } from './chat/users'
import { parseBody } from './chat/validation'
import { healthRouter } from './routes/health'
import { meRouter } from './routes/me'
import { assistantRouter } from './routes/assistant'
import { ownerChatRouter } from './routes/owner-chat'
import { conversationsRouter } from './routes/conversations'

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

app.route('/', healthRouter)
app.route('/', meRouter)
app.route('/', assistantRouter)

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

app.route('/', conversationsRouter)
app.route('/', ownerChatRouter)

app.onError((error, context) => {
  const apiError = toApiError(error)
  return context.json(apiError.toJSON(), apiError.status as ContentfulStatusCode)
})

export default app
