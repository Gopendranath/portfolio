import { Hono } from 'hono'
import { editMessageSchema } from '../../src/lib/chat/protocol'
import { editMessage } from '../chat/messages'
import { consumeUserRateLimit } from '../chat/rate-limit'
import { parseBody } from '../chat/validation'
import { requireAppUser } from '../http/app-user'
import { assertAllowedRateLimit } from '../http/guards'

export const messageEditRouter = new Hono().patch('/api/messages/:id', async (context) => {
  const { pool, app, input } = await requireAppUser(context, () =>
    parseBody(editMessageSchema, context.req.raw),
  )
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
