import type { Pool } from 'pg'
import { type ChatAuthor, type ChatMessageDTO, PAGE_SIZE } from '../../src/lib/chat/protocol'
import { withTransaction } from './db'
import { ApiError } from './errors'

export interface MessageRow {
  id: string
  seq: string
  conversation_id: string
  author: ChatAuthor
  body: string
  status: ChatMessageDTO['status']
  client_id: string | null
  created_at: Date
  edited_at: Date | null
  error_code: string | null
}

export const MESSAGE_COLUMNS = `
  id, seq, conversation_id, author, body, status, client_id, created_at,
  edited_at, error_code
`

export function toMessageDTO(row: MessageRow): ChatMessageDTO {
  return {
    id: row.id,
    seq: Number(row.seq),
    conversationId: row.conversation_id,
    author: row.author,
    body: row.body,
    status: row.status,
    clientId: row.client_id,
    sentAt: row.created_at.toISOString(),
    editedAt: row.edited_at?.toISOString() ?? null,
    errorCode: row.error_code,
  }
}

export interface CreateMessageInput {
  conversationId: string
  author: ChatAuthor
  body: string
  clientId?: string | null
  status?: ChatMessageDTO['status']
  replyToId?: string | null
  model?: string | null
  errorCode?: string | null
  errorMessage?: string | null
}

export async function createMessage(
  pool: Pool,
  input: CreateMessageInput,
): Promise<ChatMessageDTO> {
  const row = await withTransaction(pool, async (client) => {
    const { rows } = await client.query<MessageRow>(
      `insert into messages (
         conversation_id, author, body, status, client_id, reply_to_id, model,
         error_code, error_message
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       on conflict (conversation_id, client_id) where client_id is not null
       do update set body = messages.body
       returning ${MESSAGE_COLUMNS}`,
      [
        input.conversationId,
        input.author,
        input.body,
        input.status ?? 'complete',
        input.clientId ?? null,
        input.replyToId ?? null,
        input.model ?? null,
        input.errorCode ?? null,
        input.errorMessage ?? null,
      ],
    )

    const inserted = rows[0]
    if (!inserted) {
      throw new ApiError('INTERNAL', 'Could not create the message')
    }

    await client.query(
      `update conversations
          set last_message_at = greatest(last_message_at, $2),
              updated_at = now()
        where id = $1`,
      [input.conversationId, inserted.created_at],
    )

    return inserted
  })

  return toMessageDTO(row)
}

export async function listMessages(
  pool: Pool,
  conversationId: string,
  options: { beforeSeq?: number; limit?: number } = {},
): Promise<{
  messages: ChatMessageDTO[]
  hasMore: boolean
  nextCursor: number | null
}> {
  const limit = Math.min(options.limit ?? PAGE_SIZE, PAGE_SIZE)
  await pool.query(
    `update messages
        set status = 'failed',
            error_code = coalesce(error_code, 'STALE_STREAM'),
            error_message = coalesce(error_message, 'The response was interrupted.')
      where conversation_id = $1
        and status = 'streaming'
        and created_at < now() - interval '2 minutes'`,
    [conversationId],
  )

  const { rows } = await pool.query<MessageRow>(
    `select ${MESSAGE_COLUMNS}
       from messages
      where conversation_id = $1
        and deleted_at is null
        and status <> 'superseded'
        and ($2::bigint is null or seq < $2)
      order by seq desc
      limit $3`,
    [conversationId, options.beforeSeq ?? null, limit + 1],
  )

  const hasMore = rows.length > limit
  const pageRows = rows.slice(0, limit).reverse()
  const messages = pageRows.map(toMessageDTO)

  return {
    messages,
    hasMore,
    nextCursor: hasMore && messages[0] ? messages[0].seq : null,
  }
}

export async function editMessage(
  pool: Pool,
  input: {
    messageId: string
    userId: string
    body: string
    allowOwner?: boolean
    now?: Date
  },
): Promise<ChatMessageDTO> {
  const now = input.now ?? new Date()

  const row = await withTransaction(pool, async (client) => {
    const { rows } = await client.query<{
      id: string
      body: string
      author: ChatAuthor
      conversation_id: string
      user_id: string
      kind: string
    }>(
      `select m.id, m.body, m.author, m.conversation_id, c.user_id, c.kind
         from messages m
         join conversations c on c.id = m.conversation_id
        where m.id = $1
          and m.deleted_at is null
        for update`,
      [input.messageId],
    )

    const existing = rows[0]
    const canEdit =
      existing &&
      existing.kind === 'owner' &&
      ((existing.author === 'user' && existing.user_id === input.userId) ||
        (input.allowOwner === true && existing.author === 'owner'))

    if (!existing || !canEdit) {
      throw new ApiError('NOT_FOUND', 'Message not found')
    }

    await client.query(
      `insert into message_revisions (message_id, body, edited_by_user_id, edited_at)
       values ($1, $2, $3, $4)`,
      [existing.id, existing.body, input.userId, now],
    )

    const updated = await client.query<MessageRow>(
      `update messages
          set body = $2, edited_at = $3
        where id = $1
        returning ${MESSAGE_COLUMNS}`,
      [existing.id, input.body, now],
    )

    await client.query(
      `update conversations
          set updated_at = now()
        where id = $1`,
      [existing.conversation_id],
    )

    return updated.rows[0]
  })

  if (!row) {
    throw new ApiError('INTERNAL', 'Could not update the message')
  }
  return toMessageDTO(row)
}
