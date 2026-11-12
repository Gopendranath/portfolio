import { Hono } from 'hono'
import {
  paginationSchema,
  sendMessageSchema,
  threadPaginationSchema,
} from '../../src/lib/chat/protocol'
import { requireAuth } from '../chat/auth'
import { getPool } from '../chat/db'
import {
  createOwnerReply,
  getOwnerThreadMessages,
  listOwnerThreads,
  markOwnerRead,
  markOwnerUnread,
} from '../chat/inbox'
import { consumeUserRateLimit } from '../chat/rate-limit'
import { resolveAppUser } from '../chat/users'
import { parseBody } from '../chat/validation'
import { assertAllowedRateLimit, assertOwner } from '../http/guards'

export const ownerInboxRouter = new Hono()
  .get('/api/owner/threads', async (context) => {
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
  .get('/api/owner/threads/:userId/messages', async (context) => {
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
  .post('/api/owner/threads/:userId/messages', async (context) => {
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
  .post('/api/owner/threads/:userId/read', async (context) => {
    const { authUserId } = await requireAuth(context.req.raw)
    const pool = getPool()
    const { isOwner } = await resolveAppUser(pool, authUserId)
    assertOwner(isOwner)
    await markOwnerRead(pool, context.req.param('userId'))
    return context.json({ ok: true })
  })
  .post('/api/owner/threads/:userId/unread', async (context) => {
    const { authUserId } = await requireAuth(context.req.raw)
    const pool = getPool()
    const { isOwner } = await resolveAppUser(pool, authUserId)
    assertOwner(isOwner)
    await markOwnerUnread(pool, context.req.param('userId'))
    return context.json({ ok: true })
  })
