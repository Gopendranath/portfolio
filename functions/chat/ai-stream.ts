import type { Pool } from 'pg'
import { type ChatMessageDTO, MAX_AI_OUTPUT_CHARS } from '../../src/lib/chat/protocol'
import type { OpenRouterGateway } from './openrouter'
import { buildAiContext, buildSystemPrompt } from './prompt'

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
    [messageId, input.body, input.status, input.outputTokens, input.errorCode, input.errorMessage],
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
        const slice = Array.from(delta.text).slice(0, Math.max(0, remaining)).join('')
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
