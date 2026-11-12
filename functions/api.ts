import { Hono } from 'hono'
import { requireAuth } from './chat/auth'
import { getCorsHeaders } from './chat/cors'
import { toApiError } from './chat/errors'

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

app.get('/api/health', (context) => context.json({ ok: true }))

app.get('/api/me', async (context) => {
  const { authUserId } = await requireAuth(context.req.raw)
  return context.json({ user: { authUserId } })
})

app.onError((error, context) => {
  const apiError = toApiError(error)
  return context.json(apiError.toJSON(), apiError.status as 400)
})

export default app
