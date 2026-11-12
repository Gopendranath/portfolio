import type { Pool } from 'pg'
import {
  type ChatMessageDTO,
  type OwnerThreadDTO,
  type OwnerThreadPage,
  PAGE_SIZE,
} from '../../src/lib/chat/protocol'
import {
  createMessage,
  getConversationForUser,
  listMessages,
  markRead,
} from './conversations'
import { ApiError } from './errors'

interface ThreadRow {
  id: string
  user_id: string
  github_login: string | null
  last_message: string
  last_message_at: Date
  unread_count: number
}

function parseCursor(
  cursor: string | undefined,
): { at: Date; id: string } | null {
  if (!cursor) {
    return null
  }

  const separator = cursor.lastIndexOf('|')
  if (separator <= 0) {
    throw new ApiError('VALIDATION', 'Invalid thread cursor')
  }

  const at = new Date(cursor.slice(0, separator))
  const id = cursor.slice(separator + 1)

  if (Number.isNaN(at.getTime()) || !/^[0-9a-f-]{36}$/i.test(id)) {
    throw new ApiError('VALIDATION', 'Invalid thread cursor')
  }

  return { at, id }
}

export async function listOwnerThreads(
  pool: Pool,
  options: { limit?: number; before?: string } = {},
): Promise<OwnerThreadPage> {
  const limit = Math.min(options.limit ?? 20, 20)
  const before = parseCursor(options.before)

  const { rows } = await pool.query<ThreadRow>(
    `select
       c.id,
       c.user_id,
       u.github_login,
       c.last_message_at,
       coalesce(lm.body, '') as last_message,
       (
         select count(*)::int
           from messages m
          where m.conversation_id = c.id
            and m.author = 'user'
            and m.deleted_at is null
            and (
              c.owner_last_read_at is null
              or m.created_at > c.owner_last_read_at
              or (m.edited_at is not null and m.edited_at > c.owner_last_read_at)
            )
       ) as unread_count
     from conversations c
     join app_users u on u.id = c.user_id
     left join lateral (
       select body
         from messages
        where conversation_id = c.id and deleted_at is null
        order by seq desc
        limit 1
     ) lm on true
     where c.kind = 'owner'
       and exists (
         select 1 from messages m
          where m.conversation_id = c.id and m.deleted_at is null
       )
       and (
         $1::timestamptz is null
         or (c.last_message_at, c.id) < ($1::timestamptz, $2::uuid)
       )
     order by c.last_message_at desc, c.id desc
     limit $3`,
    [before?.at ?? null, before?.id ?? null, limit + 1],
  )

  const hasMore = rows.length > limit
  const pageRows = rows.slice(0, limit)
  const threads: OwnerThreadDTO[] = pageRows.map((row) => ({
    conversationId: row.id,
    userId: row.user_id,
    githubLogin: row.github_login,
    lastMessage: row.last_message,
    lastMessageAt: row.last_message_at.toISOString(),
    unreadCount: row.unread_count,
  }))
  const last = threads.at(-1)

  return {
    threads,
    hasMore,
    nextCursor:
      hasMore && last ? `${last.lastMessageAt}|${last.conversationId}` : null,
  }
}

export async function countUserOwnerUnread(
  pool: Pool,
  userId: string,
): Promise<number> {
  const { rows } = await pool.query<{ count: number }>(
    `select count(*)::int as count
       from messages m
       join conversations c on c.id = m.conversation_id
      where c.user_id = $1
        and c.kind = 'owner'
        and m.author = 'owner'
        and m.deleted_at is null
        and (
          c.user_last_read_at is null
          or m.created_at > c.user_last_read_at
          or (m.edited_at is not null and m.edited_at > c.user_last_read_at)
        )`,
    [userId],
  )
  return rows[0]?.count ?? 0
}

export async function getOwnerThreadMessages(
  pool: Pool,
  visitorUserId: string,
  options: { limit?: number; beforeSeq?: number } = {},
): Promise<{
  messages: ChatMessageDTO[]
  hasMore: boolean
  nextCursor: number | null
}> {
  const conversation = await getConversationForUser(
    pool,
    visitorUserId,
    'owner',
  )

  return listMessages(pool, conversation.id, options)
}

export async function createOwnerReply(
  pool: Pool,
  input: {
    visitorUserId: string
    body: string
    clientId: string
  },
): Promise<ChatMessageDTO> {
  const conversation = await getConversationForUser(
    pool,
    input.visitorUserId,
    'owner',
  )

  const message = await createMessage(pool, {
    conversationId: conversation.id,
    author: 'owner',
    body: input.body,
    clientId: input.clientId,
  })

  await markRead(pool, conversation.id, 'owner')
  return message
}

export async function markOwnerRead(
  pool: Pool,
  visitorUserId: string,
): Promise<void> {
  const conversation = await getConversationForUser(
    pool,
    visitorUserId,
    'owner',
  )
  await markRead(pool, conversation.id, 'owner')
}

export { PAGE_SIZE }
