import type { Context } from 'hono'
import type { Pool } from 'pg'
import { requireAuth } from '../chat/auth'
import { getPool } from '../chat/db'
import { type AppUserResolution, resolveAppUser } from '../chat/users'

export interface AppUserRequest<T = undefined> {
  authUserId: string
  pool: Pool
  app: AppUserResolution
  input: T
}

export async function requireAppUser<T = undefined>(
  context: Context,
  validate?: () => Promise<T> | T,
): Promise<AppUserRequest<T>> {
  const { authUserId } = await requireAuth(context.req.raw)
  const input = validate ? await validate() : (undefined as T)
  const pool = getPool()
  const app = await resolveAppUser(pool, authUserId)
  return { authUserId, pool, app, input }
}
