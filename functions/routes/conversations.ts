import { Hono } from 'hono'
import { z } from 'zod'
import {
  assistantHistoryQuerySchema,
  assistantMessagesQuerySchema,
  chatKindSchema,
  editMessageSchema,
  paginationSchema,
} from '../../src/lib/chat/protocol'
import { requireAuth } from '../chat/auth'
import {
  editMessage,
  getOrCreateConversation,
  listMessages,
  markRead,
} from '../chat/conversations'
import { getPool } from '../chat/db'
import { ApiError } from '../chat/errors'
import {
  deleteAssistantConversation,
  getLatestAssistantConversation,
  getOwnedAssistantConversation,
  listAssistantConversations,
} from '../chat/history'
import { markUserOwnerUnread } from '../chat/inbox'
import { consumeUserRateLimit } from '../chat/rate-limit'
import { resolveAppUser } from '../chat/users'
import { parseBody } from '../chat/validation'
import { assertAiEligible, assertAllowedRateLimit } from '../http/guards'

export const conversationsRouter = new Hono()
  .get('/api/conversations/assistant', async (context) => {
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
  .get('/api/conversations/:kind/messages', async (context) => {
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
  .delete('/api/conversations/:id', async (context) => {
    const { authUserId } = await requireAuth(context.req.raw)
    const pool = getPool()
    const { user, aiEligible, aiReason } = await resolveAppUser(pool, authUserId)
    assertAiEligible({ aiEligible, aiReason })
    const conversationId = z.string().uuid().parse(context.req.param('id'))
    await deleteAssistantConversation(pool, user.id, conversationId)
    return context.json({ ok: true })
  })
  .patch('/api/messages/:id', async (context) => {
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
  .post('/api/conversations/owner/read', async (context) => {
    const { authUserId } = await requireAuth(context.req.raw)
    const pool = getPool()
    const { user } = await resolveAppUser(pool, authUserId)
    const conversation = await getOrCreateConversation(pool, user.id, 'owner')
    await markRead(pool, conversation.id, 'user')
    return context.json({ ok: true })
  })
  .post('/api/conversations/owner/unread', async (context) => {
    const { authUserId } = await requireAuth(context.req.raw)
    const pool = getPool()
    const { user } = await resolveAppUser(pool, authUserId)
    await markUserOwnerUnread(pool, user.id)
    return context.json({ ok: true })
  })
  .post('/api/conversations/:id/read', async (context) => {
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
