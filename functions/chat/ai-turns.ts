import type { Pool } from 'pg'
import { AI_CONTEXT_MESSAGE_LIMIT, type ChatMessageDTO } from '../../src/lib/chat/protocol'
import { createAssistantConversation } from './conversations'
import { withTransaction } from './db'
import { ApiError } from './errors'
import {
  getOwnedAssistantConversation,
  retitleAssistantConversation,
  setAssistantTitleIfEmpty,
} from './history'
import { MESSAGE_COLUMNS, type MessageRow, toMessageDTO } from './message-rows'
import {
  lockMessageForUpdate,
  lockRetryTarget,
  writeAssistantEdit,
  writeAssistantRetry,
} from './message-writes'
import { createMessage } from './messages'
import { OPENROUTER_MODEL } from './openrouter'

async function loadContext(
  pool: Pool,
  conversationId: string,
  maxSeq?: number,
): Promise<ChatMessageDTO[]> {
  const { rows } = await pool.query<MessageRow>(
    `select ${MESSAGE_COLUMNS}
       from messages
      where conversation_id = $1
        and status = 'complete'
        and deleted_at is null
        and ($2::bigint is null or seq <= $2)
      order by seq desc
      limit $3`,
    [conversationId, maxSeq ?? null, AI_CONTEXT_MESSAGE_LIMIT],
  )

  return rows.reverse().map(toMessageDTO)
}

export interface AssistantTurn {
  conversationId: string
  userMessage: ChatMessageDTO
  assistantMessage: ChatMessageDTO
  context: ChatMessageDTO[]
}

export async function beginAssistantTurn(
  pool: Pool,
  input: {
    userId: string
    body: string
    clientId: string
    conversationId?: string
  },
): Promise<AssistantTurn> {
  const conversation = input.conversationId
    ? await getOwnedAssistantConversation(pool, input.userId, input.conversationId)
    : await createAssistantConversation(pool, input.userId)
  const userMessage = await createMessage(pool, {
    conversationId: conversation.id,
    author: 'user',
    body: input.body,
    clientId: input.clientId,
  })
  await setAssistantTitleIfEmpty(pool, conversation.id, input.body)

  const existing = await pool.query<{ id: string }>(
    `select id from messages
      where reply_to_id = $1 and author = 'assistant'
      order by seq desc
      limit 1`,
    [userMessage.id],
  )

  if (existing.rows[0]) {
    throw new ApiError('DUPLICATE', 'This message already has an assistant reply')
  }

  let assistantMessage: ChatMessageDTO
  try {
    assistantMessage = await createMessage(pool, {
      conversationId: conversation.id,
      author: 'assistant',
      body: '',
      status: 'streaming',
      replyToId: userMessage.id,
      model: OPENROUTER_MODEL,
    })
  } catch (error) {
    if ((error as { code?: string }).code === '23505') {
      throw new ApiError('DUPLICATE', 'This message already has an assistant reply')
    }
    throw error
  }

  return {
    conversationId: conversation.id,
    userMessage,
    assistantMessage,
    context: await loadContext(pool, conversation.id),
  }
}

export async function beginAssistantEdit(
  pool: Pool,
  input: { userId: string; messageId: string; body: string },
): Promise<AssistantTurn> {
  const now = new Date()

  const { conversationId, seq, edited, assistant } = await withTransaction(
    pool,
    async (client) => {
      const message = await lockMessageForUpdate(client, input.messageId)

      if (
        !message ||
        message.userId !== input.userId ||
        message.kind !== 'assistant' ||
        message.author !== 'user'
      ) {
        throw new ApiError('NOT_FOUND', 'Message not found')
      }

      const { edited, assistant } = await writeAssistantEdit(client, {
        message,
        body: input.body,
        editorUserId: input.userId,
        now,
        model: OPENROUTER_MODEL,
      })

      return { conversationId: message.conversationId, seq: message.seq, edited, assistant }
    },
  )

  await retitleAssistantConversation(pool, conversationId, seq, input.body)

  return {
    conversationId,
    userMessage: toMessageDTO(edited),
    assistantMessage: toMessageDTO(assistant),
    context: await loadContext(pool, conversationId, seq),
  }
}

export async function beginAssistantRetry(
  pool: Pool,
  input: { userId: string; assistantMessageId: string },
): Promise<AssistantTurn> {
  const now = new Date()

  const { conversationId, userMessage, assistant } = await withTransaction(
    pool,
    async (client) => {
      const failed = await lockRetryTarget(client, input.assistantMessageId)

      if (
        !failed ||
        failed.userId !== input.userId ||
        failed.kind !== 'assistant' ||
        failed.author !== 'assistant' ||
        failed.status !== 'failed'
      ) {
        throw new ApiError('NOT_FOUND', 'Failed assistant message not found')
      }

      const userRows = await client.query<MessageRow>(
        `select ${MESSAGE_COLUMNS}
           from messages
          where conversation_id = $1
            and seq < $2
            and author = 'user'
            and deleted_at is null
          order by seq desc
          limit 1`,
        [failed.conversationId, failed.seq],
      )

      const userMessage = userRows.rows[0]
      if (!userMessage) {
        throw new ApiError('CONFLICT', 'No user message to retry')
      }

      const assistant = await writeAssistantRetry(client, {
        failed,
        userMessage,
        now,
        model: OPENROUTER_MODEL,
      })

      return { conversationId: failed.conversationId, userMessage, assistant }
    },
  )

  return {
    conversationId,
    userMessage: toMessageDTO(userMessage),
    assistantMessage: toMessageDTO(assistant),
    context: await loadContext(pool, conversationId, Number(userMessage.seq)),
  }
}
