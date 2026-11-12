import type { Pool } from 'pg'
import { ApiError } from './errors'

export async function createAssistantConversation(
  pool: Pool,
  userId: string,
): Promise<{ id: string }> {
  const { rows } = await pool.query<{ id: string }>(
    `insert into conversations (user_id, kind)
     values ($1, 'assistant')
     returning id`,
    [userId],
  )

  const row = rows[0]
  if (!row) {
    throw new ApiError('INTERNAL', 'Could not create the conversation')
  }
  return row
}

export async function getOrCreateConversation(
  pool: Pool,
  userId: string,
  kind: 'owner' | 'assistant',
): Promise<{ id: string }> {
  if (kind === 'assistant') {
    return createAssistantConversation(pool, userId)
  }

  const existing = await pool.query<{ id: string }>(
    `select id
       from conversations
      where user_id = $1
        and kind = 'owner'
      limit 1`,
    [userId],
  )
  if (existing.rows[0]) {
    return existing.rows[0]
  }

  try {
    const { rows } = await pool.query<{ id: string }>(
      `insert into conversations (user_id, kind)
       values ($1, 'owner')
       returning id`,
      [userId],
    )

    const row = rows[0]
    if (!row) {
      throw new ApiError('INTERNAL', 'Could not create the conversation')
    }
    return row
  } catch (error) {
    if ((error as { code?: string }).code === '23505') {
      const raced = await pool.query<{ id: string }>(
        `select id
           from conversations
          where user_id = $1
            and kind = 'owner'
          limit 1`,
        [userId],
      )
      const row = raced.rows[0]
      if (row) {
        return row
      }
    }
    throw error
  }
}

export async function markRead(
  pool: Pool,
  conversationId: string,
  side: 'user' | 'owner',
  now = new Date(),
): Promise<void> {
  const statement =
    side === 'user'
      ? `update conversations
            set user_last_read_at = $2, updated_at = now()
          where id = $1`
      : `update conversations
            set owner_last_read_at = $2, updated_at = now()
          where id = $1`

  await pool.query(statement, [conversationId, now])
}

export async function markUnread(
  pool: Pool,
  conversationId: string,
  side: 'user' | 'owner',
): Promise<void> {
  const statement =
    side === 'user'
      ? `update conversations c
            set user_last_read_at = (
                  select m.created_at - interval '1 microsecond'
                    from messages m
                   where m.conversation_id = c.id
                     and m.author = 'owner'
                     and m.deleted_at is null
                   order by m.created_at desc
                   limit 1
                ),
                updated_at = now()
          where c.id = $1`
      : `update conversations c
            set owner_last_read_at = (
                  select m.created_at - interval '1 microsecond'
                    from messages m
                   where m.conversation_id = c.id
                     and m.author = 'user'
                     and m.deleted_at is null
                   order by m.created_at desc
                   limit 1
                ),
                updated_at = now()
          where c.id = $1`

  await pool.query(statement, [conversationId])
}

export async function getOwnedConversationById(
  pool: Pool,
  userId: string,
  conversationId: string,
): Promise<{ id: string }> {
  const { rows } = await pool.query<{ id: string }>(
    'select id from conversations where id = $1 and user_id = $2',
    [conversationId, userId],
  )

  const row = rows[0]
  if (!row) {
    throw new ApiError('NOT_FOUND', 'Conversation not found')
  }
  return row
}

export async function getConversationForUser(
  pool: Pool,
  userId: string,
  kind: 'owner' | 'assistant',
): Promise<{ id: string }> {
  const { rows } = await pool.query<{ id: string }>(
    `select id from conversations where user_id = $1 and kind = $2`,
    [userId, kind],
  )

  const row = rows[0]
  if (!row) {
    throw new ApiError('NOT_FOUND', 'Conversation not found')
  }
  return row
}
