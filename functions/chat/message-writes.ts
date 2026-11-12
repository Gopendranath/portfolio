import type { PoolClient } from 'pg'
import type { ChatAuthor, MessageStatus } from '../../src/lib/chat/protocol'
import { ApiError } from './errors'
import { MESSAGE_COLUMNS, type MessageRow } from './message-rows'

export interface LockedMessage {
  id: string
  body: string
  author: ChatAuthor
  conversationId: string
  seq: number
  status: MessageStatus
  userId: string
  kind: 'owner' | 'assistant'
}

export async function lockMessageForUpdate(
  client: PoolClient,
  messageId: string,
): Promise<LockedMessage | undefined> {
  const { rows } = await client.query<{
    id: string
    body: string
    author: ChatAuthor
    conversation_id: string
    seq: string
    status: MessageStatus
    user_id: string
    kind: 'owner' | 'assistant'
  }>(
    `select m.id, m.body, m.author, m.conversation_id, m.seq, m.status,
            c.user_id, c.kind
       from messages m
       join conversations c on c.id = m.conversation_id
      where m.id = $1
        and m.deleted_at is null
      for update`,
    [messageId],
  )

  const row = rows[0]
  if (!row) {
    return undefined
  }

  return {
    id: row.id,
    body: row.body,
    author: row.author,
    conversationId: row.conversation_id,
    seq: Number(row.seq),
    status: row.status,
    userId: row.user_id,
    kind: row.kind,
  }
}

export async function writeUserEdit(
  client: PoolClient,
  input: {
    message: LockedMessage
    body: string
    editorUserId: string
    now: Date
  },
): Promise<MessageRow> {
  await client.query(
    `insert into message_revisions (message_id, body, edited_by_user_id, edited_at)
     values ($1, $2, $3, $4)`,
    [input.message.id, input.message.body, input.editorUserId, input.now],
  )

  const updated = await client.query<MessageRow>(
    `update messages
        set body = $2, edited_at = $3
      where id = $1
      returning ${MESSAGE_COLUMNS}`,
    [input.message.id, input.body, input.now],
  )

  await client.query(
    `update conversations
        set updated_at = now()
      where id = $1`,
    [input.message.conversationId],
  )

  const row = updated.rows[0]
  if (!row) {
    throw new ApiError('INTERNAL', 'Could not update the message')
  }

  return row
}
