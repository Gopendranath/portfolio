import { Hono } from 'hono'
import { requireAuth } from '../chat/auth'
import { getPool } from '../chat/db'
import { countUserOwnerUnread } from '../chat/inbox'
import { resolveAppUser } from '../chat/users'

export const meRouter = new Hono().get('/api/me', async (context) => {
  const { authUserId } = await requireAuth(context.req.raw)
  const pool = getPool()
  const { user, isOwner, aiEligible, aiReason } = await resolveAppUser(pool, authUserId)
  const ownerUnreadCount = await countUserOwnerUnread(pool, user.id)

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
    ownerUnreadCount,
  })
})
