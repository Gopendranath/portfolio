import { Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { requireAuth } from './chat/auth'
import { getCorsHeaders } from './chat/cors'
import { getPool } from './chat/db'
import { toApiError } from './chat/errors'
import { resolveAppUser } from './chat/users'

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
  const { user, isOwner, aiEligible, aiReason } = await resolveAppUser(
    getPool(),
    authUserId,
  )

  return context.json({
    user: {
      id: user.id,
      githubLogin: user.githubLogin,
      githubCreatedAt: user.githubCreatedAt?.toISOString() ?? null,
      role: user.role,
    },
    isOwner,
    aiEligible,
    aiReason,
  })
})

app.onError((error, context) => {
  const apiError = toApiError(error)
  return context.json(
    apiError.toJSON(),
    apiError.status as ContentfulStatusCode,
  )
})

export default app
