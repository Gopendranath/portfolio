import { Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { getCorsHeaders } from './chat/cors'
import { toApiError } from './chat/errors'
import { assistantRouter } from './routes/assistant'
import { conversationsRouter } from './routes/conversations'
import { healthRouter } from './routes/health'
import { meRouter } from './routes/me'
import { ownerChatRouter } from './routes/owner-chat'
import { ownerInboxRouter } from './routes/owner-inbox'

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
app.route('/', ownerChatRouter)
app.route('/', conversationsRouter)
app.route('/', ownerInboxRouter)

app.onError((error, context) => {
  const apiError = toApiError(error)
  return context.json(apiError.toJSON(), apiError.status as ContentfulStatusCode)
})

export default app
