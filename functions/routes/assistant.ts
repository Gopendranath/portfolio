import { Hono } from 'hono'
import {
  assistantEditSchema,
  assistantRetrySchema,
  assistantSendSchema,
} from '../../src/lib/chat/protocol'
import {
  beginAssistantEdit,
  beginAssistantRetry,
  beginAssistantTurn,
} from '../chat/ai-turns'
import { requireAuth } from '../chat/auth'
import { getPool } from '../chat/db'
import {
  findAssistantConversationByClientId,
  getLatestAssistantConversation,
  getOwnedAssistantConversation,
} from '../chat/history'
import { createOpenRouterGateway } from '../chat/openrouter'
import { resolveAppUser } from '../chat/users'
import { parseBody } from '../chat/validation'
import { assertAiEligible, assertAiRateLimits } from '../http/guards'
import { streamTurn } from '../http/sse'

export const assistantRouter = new Hono()
  .post('/api/chat/assistant', async (context) => {
    const { authUserId } = await requireAuth(context.req.raw)
    const input = await parseBody(assistantSendSchema, context.req.raw)
    const pool = getPool()
    const { user, aiEligible, aiReason } = await resolveAppUser(pool, authUserId)
    assertAiEligible({ aiEligible, aiReason })
    const conversationId =
      input.conversationId === undefined
        ? ((
            (await findAssistantConversationByClientId(pool, user.id, input.clientId)) ??
            (await getLatestAssistantConversation(pool, user.id))
          )?.id ?? undefined)
        : (input.conversationId ?? undefined)
    if (conversationId) {
      await getOwnedAssistantConversation(pool, user.id, conversationId)
    }
    await assertAiRateLimits(context, pool, user.id)

    const gateway = createOpenRouterGateway()
    const turn = await beginAssistantTurn(pool, {
      userId: user.id,
      body: input.body,
      clientId: input.clientId,
      conversationId,
    })

    return streamTurn(context, pool, turn, gateway)
  })
  .post('/api/chat/assistant/edit', async (context) => {
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
  .post('/api/chat/assistant/retry', async (context) => {
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
