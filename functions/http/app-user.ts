import type { Context } from 'hono'
import type { Pool } from 'pg'
import { requireAuth } from '../chat/auth'
import { getPool } from '../chat/db'
import { type AppUserResolution, resolveAppUser } from '../chat/users'

export interface AppUserRequest {
  authUserId: string
  pool: Pool
  app: AppUserResolution
}

export async function requireAppUser(context: Context): Promise<AppUserRequest> {
  const { authUserId } = await requireAuth(context.req.raw)
  const pool = getPool()
  const app = await resolveAppUser(pool, authUserId)
  return { authUserId, pool, app }
}
