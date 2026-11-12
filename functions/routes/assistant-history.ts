import { Hono } from 'hono'
import { z } from 'zod'
import { assistantHistoryQuerySchema } from '../../src/lib/chat/protocol'
import { deleteAssistantConversation, listAssistantConversations } from '../chat/history'
import { requireAppUser } from '../http/app-user'
import { assertAiEligible } from '../http/guards'

export const assistantHistoryRouter = new Hono()
  .get('/api/conversations/assistant', async (context) => {
    const {
      pool,
      app,
      input: query,
    } = await requireAppUser(context, () =>
      assistantHistoryQuerySchema.parse({
        limit: context.req.query('limit'),
        before: context.req.query('before'),
      }),
    )
    const { user, aiEligible, aiReason } = app
    assertAiEligible({ aiEligible, aiReason })
    const page = await listAssistantConversations(pool, user.id, query)
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
