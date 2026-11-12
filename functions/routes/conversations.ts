import { Hono } from 'hono'
import { z } from 'zod'
import {
  assistantHistoryQuerySchema,
  assistantMessagesQuerySchema,
  chatKindSchema,
  editMessageSchema,
  paginationSchema,
} from '../../src/lib/chat/protocol'
import { getOrCreateConversation, markRead } from '../chat/conversations'
import { ApiError } from '../chat/errors'
import {
  deleteAssistantConversation,
  getLatestAssistantConversation,
  getOwnedAssistantConversation,
  listAssistantConversations,
} from '../chat/history'
import { markUserOwnerUnread } from '../chat/inbox'
import { getMessagePage } from '../chat/message-page'
import { editMessage } from '../chat/messages'
import { consumeUserRateLimit } from '../chat/rate-limit'
import { parseBody } from '../chat/validation'
import { requireAppUser } from '../http/app-user'
import { assertAiEligible, assertAllowedRateLimit } from '../http/guards'

export const conversationsRouter = new Hono()
  .get('/api/conversations/assistant', async (context) => {
    const { pool, app } = await requireAppUser(context)
    const query = assistantHistoryQuerySchema.parse({
      limit: context.req.query('limit'),
      before: context.req.query('before'),
    })
    const { user, aiEligible, aiReason } = app
    assertAiEligible({ aiEligible, aiReason })
    const page = await listAssistantConversations(pool, user.id, query)
    return context.json(page)
  })
  .get('/api/conversations/:kind/messages', async (context) => {
    const { pool, app } = await requireAppUser(context)
    const kind = chatKindSchema.parse(context.req.param('kind'))
    const { user, aiEligible, aiReason } = app

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
        const page = await getMessagePage(pool, latest.id, {
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
      const page = await getMessagePage(pool, conversation.id, {
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
    const page = await getMessagePage(pool, conversation.id, {
      beforeSeq: query.before,
      limit: query.limit,
    })

    return context.json(page)
  })
  .delete('/api/conversations/:id', async (context) => {
    const { pool, app } = await requireAppUser(context)
    const { user, aiEligible, aiReason } = app
    assertAiEligible({ aiEligible, aiReason })
    const conversationId = z.string().uuid().parse(context.req.param('id'))
    await deleteAssistantConversation(pool, user.id, conversationId)
    return context.json({ ok: true })
  })
  .patch('/api/messages/:id', async (context) => {
    const { pool, app } = await requireAppUser(context)
    const input = await parseBody(editMessageSchema, context.req.raw)
    const { user, isOwner } = app
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
    const { pool, app } = await requireAppUser(context)
    const { user } = app
    const conversation = await getOrCreateConversation(pool, user.id, 'owner')
    await markRead(pool, conversation.id, 'user')
    return context.json({ ok: true })
  })
  .post('/api/conversations/owner/unread', async (context) => {
    const { pool, app } = await requireAppUser(context)
    const { user } = app
    await markUserOwnerUnread(pool, user.id)
    return context.json({ ok: true })
  })
  .post('/api/conversations/:id/read', async (context) => {
    const { pool, app } = await requireAppUser(context)
    const { user } = app
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
