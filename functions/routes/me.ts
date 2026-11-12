import { Hono } from 'hono'
import { countUserOwnerUnread } from '../chat/inbox'
import { requireAppUser } from '../http/app-user'

export const meRouter = new Hono().get('/api/me', async (context) => {
  const { pool, app } = await requireAppUser(context)
  const { user, isOwner, aiEligible, aiReason } = app
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
