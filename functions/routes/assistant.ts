import { Hono } from 'hono'
import {
  assistantEditSchema,
  assistantRetrySchema,
  assistantSendSchema,
} from '../../src/lib/chat/protocol'
import { beginAssistantEdit, beginAssistantRetry, beginAssistantTurn } from '../chat/ai-turns'
import {
  findAssistantConversationByClientId,
  getLatestAssistantConversation,
  getOwnedAssistantConversation,
} from '../chat/history'
import { createOpenRouterGateway } from '../chat/openrouter'
import { parseBody } from '../chat/validation'
import { requireAppUser } from '../http/app-user'
import { assertAiEligible, assertAiRateLimits } from '../http/guards'
import { streamTurn } from '../http/sse'

export const assistantRouter = new Hono()
  .post('/api/chat/assistant', async (context) => {
    const { pool, app, input } = await requireAppUser(context, () =>
      parseBody(assistantSendSchema, context.req.raw),
    )
    const { user, aiEligible, aiReason } = app
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
    const { pool, app, input } = await requireAppUser(context, () =>
      parseBody(assistantEditSchema, context.req.raw),
    )
    const { user, aiEligible, aiReason } = app
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
    const { pool, app, input } = await requireAppUser(context, () =>
      parseBody(assistantRetrySchema, context.req.raw),
    )
    const { user, aiEligible, aiReason } = app
    assertAiEligible({ aiEligible, aiReason })
    await assertAiRateLimits(context, pool, user.id)

    const gateway = createOpenRouterGateway()
    const turn = await beginAssistantRetry(pool, {
      userId: user.id,
      assistantMessageId: input.assistantMessageId,
    })

    return streamTurn(context, pool, turn, gateway)
  })
