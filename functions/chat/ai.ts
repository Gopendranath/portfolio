import type { Pool } from 'pg'
import {
  type ChatMessageDTO,
  MAX_AI_OUTPUT_CHARS,
} from '../../src/lib/chat/protocol'
import {
  createMessage,
  MESSAGE_COLUMNS,
  type MessageRow,
  toMessageDTO,
} from './conversations'
import { ApiError } from './errors'
import {
  createAssistantConversation,
  getOwnedAssistantConversation,
  setAssistantTitleIfEmpty,
  titleFromBody,
} from './history'
import type { OpenRouterGateway } from './openrouter'
import { OPENROUTER_MODEL } from './openrouter'
import { buildAiContext, buildSystemPrompt } from './prompt'

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
      limit 20`,
    [conversationId, maxSeq ?? null],
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
    ? await getOwnedAssistantConversation(
        pool,
        input.userId,
        input.conversationId,
      )
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
    throw new ApiError(
      'DUPLICATE',
      'This message already has an assistant reply',
    )
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
      throw new ApiError(
        'DUPLICATE',
        'This message already has an assistant reply',
      )
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
  const client = await pool.connect()
  const now = new Date()

  try {
    await client.query('begin')
    const { rows } = await client.query<{
      id: string
      body: string
      author: string
      conversation_id: string
      seq: string
      user_id: string
      kind: string
    }>(
      `select m.id, m.body, m.author, m.conversation_id, m.seq, c.user_id, c.kind
         from messages m
         join conversations c on c.id = m.conversation_id
        where m.id = $1
          and m.deleted_at is null
        for update`,
      [input.messageId],
    )

    const existing = rows[0]
    if (
      !existing ||
      existing.user_id !== input.userId ||
      existing.kind !== 'assistant' ||
      existing.author !== 'user'
    ) {
      throw new ApiError('NOT_FOUND', 'Message not found')
    }

    await client.query(
      `insert into message_revisions (message_id, body, edited_by_user_id, edited_at)
       values ($1, $2, $3, $4)`,
      [existing.id, existing.body, input.userId, now],
    )

    const edited = await client.query<MessageRow>(
      `update messages
          set body = $2, edited_at = $3
        where id = $1
        returning ${MESSAGE_COLUMNS}`,
      [existing.id, input.body, now],
    )

    await client.query(
      `update conversations c
          set title = $3, updated_at = now()
        where c.id = $1
          and c.kind = 'assistant'
          and not exists (
            select 1
              from messages m
             where m.conversation_id = c.id
               and m.author = 'user'
               and m.deleted_at is null
               and m.status <> 'superseded'
               and m.seq < $2
          )`,
      [existing.conversation_id, existing.seq, titleFromBody(input.body)],
    )

    await client.query(
      `update messages
          set status = 'superseded', deleted_at = $3
        where conversation_id = $1
          and seq > $2
          and deleted_at is null`,
      [existing.conversation_id, existing.seq, now],
    )

    const assistant = await client.query<MessageRow>(
      `insert into messages (
         conversation_id, author, body, status, reply_to_id, model
       )
       values ($1, 'assistant', '', 'streaming', $2, $3)
       returning ${MESSAGE_COLUMNS}`,
      [existing.conversation_id, existing.id, OPENROUTER_MODEL],
    )

    await client.query(
      `update conversations set updated_at = now(), last_message_at = $2 where id = $1`,
      [existing.conversation_id, now],
    )

    await client.query('commit')

    const editedRow = edited.rows[0]
    const assistantRow = assistant.rows[0]
    if (!editedRow || !assistantRow) {
      throw new ApiError('INTERNAL', 'Could not edit the message')
    }

    return {
      conversationId: existing.conversation_id,
      userMessage: toMessageDTO(editedRow),
      assistantMessage: toMessageDTO(assistantRow),
      context: await loadContext(
        pool,
        existing.conversation_id,
        Number(existing.seq),
      ),
    }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

export async function beginAssistantRetry(
  pool: Pool,
  input: { userId: string; assistantMessageId: string },
): Promise<AssistantTurn> {
  const client = await pool.connect()

  try {
    await client.query('begin')
    const { rows } = await client.query<{
      id: string
      seq: string
      conversation_id: string
      status: string
      user_id: string
      kind: string
      author: string
    }>(
      `select m.id, m.seq, m.conversation_id, m.status, m.author, c.user_id, c.kind
         from messages m
         join conversations c on c.id = m.conversation_id
        where m.id = $1
        for update`,
      [input.assistantMessageId],
    )

    const failed = rows[0]
    if (
      !failed ||
      failed.user_id !== input.userId ||
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
      [failed.conversation_id, failed.seq],
    )

    const userMessage = userRows.rows[0]
    if (!userMessage) {
      throw new ApiError('CONFLICT', 'No user message to retry')
    }

    await client.query(
      `update messages
          set status = 'superseded', deleted_at = now()
        where id = $1`,
      [failed.id],
    )

    const assistant = await client.query<MessageRow>(
      `insert into messages (
         conversation_id, author, body, status, reply_to_id, model
       )
       values ($1, 'assistant', '', 'streaming', $2, $3)
       returning ${MESSAGE_COLUMNS}`,
      [failed.conversation_id, userMessage.id, OPENROUTER_MODEL],
    )

    await client.query(
      `update conversations set updated_at = now(), last_message_at = now() where id = $1`,
      [failed.conversation_id],
    )

    await client.query('commit')

    const assistantRow = assistant.rows[0]
    if (!assistantRow) {
      throw new ApiError('INTERNAL', 'Could not create the retry message')
    }

    return {
      conversationId: failed.conversation_id,
      userMessage: toMessageDTO(userMessage),
      assistantMessage: toMessageDTO(assistantRow),
      context: await loadContext(
        pool,
        failed.conversation_id,
        Number(userMessage.seq),
      ),
    }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

export async function markAssistantFailed(
  pool: Pool,
  messageId: string,
  code = 'STREAM_INTERRUPTED',
): Promise<void> {
  await pool.query(
    `update messages
        set status = 'failed',
            error_code = coalesce(error_code, $2),
            error_message = coalesce(error_message, 'The response was interrupted.')
      where id = $1 and status = 'streaming'`,
    [messageId, code],
  )
}

export interface AssistantTurnResult {
  status: 'complete' | 'failed'
  body: string
  outputTokens: number | null
  truncated: boolean
  finishReason: string | null
  errorCode: string | null
}

async function finishMessage(
  pool: Pool,
  messageId: string,
  input: {
    body: string
    status: 'complete' | 'failed'
    outputTokens: number | null
    errorCode: string | null
    errorMessage: string | null
  },
): Promise<void> {
  await pool.query(
    `update messages
        set body = $2,
            status = $3,
            output_tokens = $4,
            error_code = $5,
            error_message = $6
      where id = $1`,
    [
      messageId,
      input.body,
      input.status,
      input.outputTokens,
      input.errorCode,
      input.errorMessage,
    ],
  )
}

export async function runAssistantTurn(input: {
  pool: Pool
  assistantMessageId: string
  context: ChatMessageDTO[]
  gateway: OpenRouterGateway
  signal?: AbortSignal
  onDelta?: (text: string) => void | Promise<void>
}): Promise<AssistantTurnResult> {
  let body = ''
  let outputTokens: number | null = null
  let truncated = false
  let finishReason: string | null = 'stop'

  try {
    const messages = [
      { role: 'system' as const, content: buildSystemPrompt() },
      ...buildAiContext(input.context),
    ]

    for await (const delta of input.gateway.stream(messages, input.signal)) {
      if (input.signal?.aborted) {
        throw new Error('aborted')
      }

      if (typeof delta.outputTokens === 'number') {
        outputTokens = delta.outputTokens
      }

      if (!delta.text) {
        continue
      }

      const next = body + delta.text
      if (Array.from(next).length > MAX_AI_OUTPUT_CHARS) {
        const remaining = MAX_AI_OUTPUT_CHARS - Array.from(body).length
        const slice = Array.from(delta.text)
          .slice(0, Math.max(0, remaining))
          .join('')
        if (slice) {
          body += slice
          await input.onDelta?.(slice)
        }
        truncated = true
        finishReason = 'length'
        break
      }

      body += delta.text
      await input.onDelta?.(delta.text)
    }

    if (input.signal?.aborted) {
      throw new Error('aborted')
    }

    if (!body.trim()) {
      await finishMessage(input.pool, input.assistantMessageId, {
        body,
        status: 'failed',
        outputTokens,
        errorCode: 'EMPTY_RESPONSE',
        errorMessage: 'The assistant returned an empty response.',
      })
      return {
        status: 'failed',
        body,
        outputTokens,
        truncated,
        finishReason: 'error',
        errorCode: 'EMPTY_RESPONSE',
      }
    }

    await finishMessage(input.pool, input.assistantMessageId, {
      body,
      status: 'complete',
      outputTokens,
      errorCode: null,
      errorMessage: null,
    })

    return {
      status: 'complete',
      body,
      outputTokens,
      truncated,
      finishReason,
      errorCode: null,
    }
  } catch (error) {
    const aborted = input.signal?.aborted === true
    const errorCode = aborted ? 'ABORTED' : 'UPSTREAM_ERROR'
    const errorMessage = aborted
      ? 'The response was stopped.'
      : 'The assistant is temporarily unavailable.'

    await finishMessage(input.pool, input.assistantMessageId, {
      body,
      status: 'failed',
      outputTokens,
      errorCode,
      errorMessage,
    })

    if (!aborted) {
      console.error('[ai] upstream error', error)
    }

    return {
      status: 'failed',
      body,
      outputTokens,
      truncated,
      finishReason: aborted ? 'aborted' : 'error',
      errorCode,
    }
  }
}
