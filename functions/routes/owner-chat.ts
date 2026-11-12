import type { Context } from 'hono'
import { Hono } from 'hono'
import type { Pool } from 'pg'
import { ownerRetrySchema, sendMessageSchema } from '../../src/lib/chat/protocol'
import { getOrCreateConversation } from '../chat/conversations'
import { createMessage } from '../chat/messages'
import { consumeUserRateLimit } from '../chat/rate-limit'
import type { AppUser } from '../chat/users'
import { parseBody } from '../chat/validation'
import { requireAppUser } from '../http/app-user'
import { assertAllowedRateLimit } from '../http/guards'

async function handleOwnerSend(
  context: Context,
  pool: Pool,
  user: AppUser,
  input: { body: string; clientId: string },
) {
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
}

export const ownerChatRouter = new Hono()
  .post('/api/chat/owner', async (context) => {
    const { pool, app, input } = await requireAppUser(context, () =>
      parseBody(sendMessageSchema, context.req.raw),
    )
    const { user } = app
    return handleOwnerSend(context, pool, user, input)
  })
  .post('/api/chat/owner/retry', async (context) => {
    const { pool, app, input } = await requireAppUser(context, () =>
      parseBody(ownerRetrySchema, context.req.raw),
    )
    const { user } = app
    return handleOwnerSend(context, pool, user, input)
  })
