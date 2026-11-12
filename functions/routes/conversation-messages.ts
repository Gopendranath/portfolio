import { Hono } from 'hono'
import {
  assistantMessagesQuerySchema,
  chatKindSchema,
  paginationSchema,
} from '../../src/lib/chat/protocol'
import { getOrCreateConversation, getOwnedConversationById, markRead } from '../chat/conversations'
import { getLatestAssistantConversation, getOwnedAssistantConversation } from '../chat/history'
import { markUserOwnerUnread } from '../chat/inbox'
import { getMessagePage } from '../chat/message-page'
import { requireAppUser } from '../http/app-user'
import { assertAiEligible } from '../http/guards'

export const conversationMessagesRouter = new Hono()
  .get('/api/conversations/:kind/messages', async (context) => {
    const {
      pool,
      app,
      input: kind,
    } = await requireAppUser(context, () => chatKindSchema.parse(context.req.param('kind')))
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
    const conversation = await getOwnedConversationById(pool, user.id, context.req.param('id'))

    await markRead(pool, conversation.id, 'user')
    return context.json({ ok: true })
  })
