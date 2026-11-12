import type { Pool } from 'pg'
import {
  type ChatAuthor,
  type ChatMessageDTO,
  type MessagePage,
  PAGE_SIZE,
} from '../../src/lib/chat/protocol'
import { withTransaction } from './db'
import { ApiError } from './errors'
import { MESSAGE_COLUMNS, type MessageRow, toMessageDTO } from './message-rows'
import { lockMessageForUpdate, writeUserEdit } from './message-writes'

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
): Promise<MessagePage> {
  const limit = Math.min(options.limit ?? PAGE_SIZE, PAGE_SIZE)

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
    const existing = await lockMessageForUpdate(client, input.messageId)
    const canEdit =
      existing &&
      existing.kind === 'owner' &&
      ((existing.author === 'user' && existing.userId === input.userId) ||
        (input.allowOwner === true && existing.author === 'owner'))

    if (!existing || !canEdit) {
      throw new ApiError('NOT_FOUND', 'Message not found')
    }

    return writeUserEdit(client, {
      message: existing,
      body: input.body,
      editorUserId: input.userId,
      now,
    })
  })

  return toMessageDTO(row)
}
