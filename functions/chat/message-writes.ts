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

export async function lockRetryTarget(
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

export async function writeAssistantEdit(
  client: PoolClient,
  input: {
    message: LockedMessage
    body: string
    editorUserId: string
    now: Date
    model: string
  },
): Promise<{ edited: MessageRow; assistant: MessageRow }> {
  await client.query(
    `insert into message_revisions (message_id, body, edited_by_user_id, edited_at)
     values ($1, $2, $3, $4)`,
    [input.message.id, input.message.body, input.editorUserId, input.now],
  )

  const edited = await client.query<MessageRow>(
    `update messages
        set body = $2, edited_at = $3
      where id = $1
      returning ${MESSAGE_COLUMNS}`,
    [input.message.id, input.body, input.now],
  )

  await client.query(
    `update messages
        set status = 'superseded', deleted_at = $3
      where conversation_id = $1
        and seq > $2
        and deleted_at is null`,
    [input.message.conversationId, input.message.seq, input.now],
  )

  const assistant = await client.query<MessageRow>(
    `insert into messages (
       conversation_id, author, body, status, reply_to_id, model
     )
     values ($1, 'assistant', '', 'streaming', $2, $3)
     returning ${MESSAGE_COLUMNS}`,
    [input.message.conversationId, input.message.id, input.model],
  )

  await client.query(
    `update conversations set updated_at = now(), last_message_at = $2 where id = $1`,
    [input.message.conversationId, input.now],
  )

  const editedRow = edited.rows[0]
  const assistantRow = assistant.rows[0]
  if (!editedRow || !assistantRow) {
    throw new ApiError('INTERNAL', 'Could not edit the message')
  }

  return { edited: editedRow, assistant: assistantRow }
}

export async function writeAssistantRetry(
  client: PoolClient,
  input: {
    failed: LockedMessage
    userMessage: MessageRow
    now: Date
    model: string
  },
): Promise<MessageRow> {
  await client.query(
    `update messages
        set status = 'superseded', deleted_at = $2
      where id = $1`,
    [input.failed.id, input.now],
  )

  const assistant = await client.query<MessageRow>(
    `insert into messages (
       conversation_id, author, body, status, reply_to_id, model
     )
     values ($1, 'assistant', '', 'streaming', $2, $3)
     returning ${MESSAGE_COLUMNS}`,
    [input.failed.conversationId, input.userMessage.id, input.model],
  )

  await client.query(
    `update conversations set updated_at = now(), last_message_at = now() where id = $1`,
    [input.failed.conversationId],
  )

  const assistantRow = assistant.rows[0]
  if (!assistantRow) {
    throw new ApiError('INTERNAL', 'Could not create the retry message')
  }

  return assistantRow
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
