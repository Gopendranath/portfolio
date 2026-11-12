import type { Pool } from 'pg'
import { ApiError } from './errors'
import {
  type AiReason,
  fetchGitHubProfile,
  getAiAccess,
  isOwnerGithubId,
  resolveGitHubProfile,
} from './github'

interface UserRow {
  id: string
  auth_user_id: string
  github_id: string
  github_login: string | null
  github_created_at: Date | null
  github_checked_at: Date | null
  role: 'user' | 'owner'
}

export interface AppUser {
  id: string
  authUserId: string
  githubId: string
  githubLogin: string | null
  githubCreatedAt: Date | null
  role: 'user' | 'owner'
}

export interface AppUserResolution {
  user: AppUser
  isOwner: boolean
  aiEligible: boolean
  aiReason: AiReason
}

const USER_COLUMNS = `
  id, auth_user_id, github_id, github_login, github_created_at,
  github_checked_at, role
`

function toAppUser(row: UserRow): AppUser {
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    githubId: row.github_id,
    githubLogin: row.github_login,
    githubCreatedAt: row.github_created_at,
    role: row.role,
  }
}

async function selectUser(
  pool: Pool,
  authUserId: string,
): Promise<UserRow | undefined> {
  const { rows } = await pool.query<UserRow>(
    `select ${USER_COLUMNS} from app_users where auth_user_id = $1`,
    [authUserId],
  )
  return rows[0]
}

async function findGitHubAccount(
  pool: Pool,
  authUserId: string,
): Promise<string> {
  const { rows } = await pool.query<{ account_id: string }>(
    `select "accountId" as account_id
       from neon_auth.account
      where "userId" = $1 and "providerId" = 'github'
      limit 1`,
    [authUserId],
  )

  const accountId = rows[0]?.account_id
  if (!accountId) {
    throw new ApiError('UNAUTHORIZED', 'No GitHub account is linked')
  }

  return accountId
}

async function insertUser(
  pool: Pool,
  authUserId: string,
  githubId: string,
  role: 'user' | 'owner',
): Promise<UserRow> {
  const { rows } = await pool.query<UserRow>(
    `insert into app_users (auth_user_id, github_id, role)
     values ($1, $2, $3)
     on conflict (auth_user_id) do update
       set github_id = excluded.github_id, updated_at = now()
     returning ${USER_COLUMNS}`,
    [authUserId, githubId, role],
  )

  const row = rows[0]
  if (!row) {
    throw new ApiError('INTERNAL', 'Could not create the user record')
  }
  return row
}

export async function resolveAppUser(
  pool: Pool,
  authUserId: string,
  now = new Date(),
): Promise<AppUserResolution> {
  let row = await selectUser(pool, authUserId)

  if (!row) {
    const githubId = await findGitHubAccount(pool, authUserId)
    row = await insertUser(
      pool,
      authUserId,
      githubId,
      isOwnerGithubId(githubId) ? 'owner' : 'user',
    )
  }

  const isOwner = isOwnerGithubId(row.github_id) || row.role === 'owner'
  let createdAt = row.github_created_at
  let login = row.github_login

  try {
    const resolved = await resolveGitHubProfile(
      {
        login: row.github_login,
        createdAt: row.github_created_at,
        checkedAt: row.github_checked_at,
      },
      () => fetchGitHubProfile(row.github_id),
      now,
    )

    createdAt = resolved.profile.createdAt
    login = resolved.profile.login

    if (resolved.source === 'network') {
      await pool.query(
        `update app_users
            set github_login = $2,
                github_created_at = $3,
                github_checked_at = $4,
                updated_at = now()
          where id = $1`,
        [row.id, login, createdAt, now],
      )
    }
  } catch (error) {
    console.warn('[github] profile check failed', error)
  }

  const access = getAiAccess({ createdAt, isOwner, now })

  return {
    user: toAppUser({
      ...row,
      github_login: login,
      github_created_at: createdAt,
    }),
    isOwner,
    aiEligible: access.eligible,
    aiReason: access.reason,
  }
}
