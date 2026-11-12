import type { Context } from 'hono'
import { streamSSE } from 'hono/streaming'
import { markAssistantFailed, runAssistantTurn, type AssistantTurn } from '../chat/ai'
import type { getPool } from '../chat/db'
import type { OpenRouterGateway } from '../chat/openrouter'

export async function streamTurn(
  context: Context,
  pool: ReturnType<typeof getPool>,
  turn: AssistantTurn,
  gateway: OpenRouterGateway,
): Promise<Response> {
  return streamSSE(context, async (stream) => {
    const controller = new AbortController()
    const heartbeat = setInterval(() => {
      void stream.write(': ping\n\n').catch(() => {})
    }, 15_000)

    stream.onAbort(() => controller.abort())

    try {
      await stream.writeSSE({
        event: 'meta',
        data: JSON.stringify({
          conversationId: turn.conversationId,
          userMessageId: turn.userMessage.id,
          assistantMessageId: turn.assistantMessage.id,
        }),
      })

      const result = await runAssistantTurn({
        pool,
        assistantMessageId: turn.assistantMessage.id,
        context: turn.context,
        gateway,
        signal: controller.signal,
        onDelta: async (text) => {
          await stream.writeSSE({
            event: 'delta',
            data: JSON.stringify({ text }),
          })
        },
      })

      if (result.status === 'complete') {
        await stream.writeSSE({
          event: 'done',
          data: JSON.stringify({
            assistantMessageId: turn.assistantMessage.id,
            finishReason: result.finishReason,
            truncated: result.truncated,
            outputTokens: result.outputTokens,
          }),
        })
      } else {
        await stream.writeSSE({
          event: 'error',
          data: JSON.stringify({
            code: result.errorCode ?? 'UPSTREAM_ERROR',
            message:
              result.errorCode === 'ABORTED'
                ? 'Response stopped.'
                : 'The assistant is temporarily unavailable.',
            retryable: true,
          }),
        })
      }
    } catch (error) {
      console.error('[sse] stream failed', error)
      await markAssistantFailed(pool, turn.assistantMessage.id)
      await stream
        .writeSSE({
          event: 'error',
          data: JSON.stringify({
            code: 'UPSTREAM_ERROR',
            message: 'The assistant is temporarily unavailable.',
            retryable: true,
          }),
        })
        .catch(() => {})
    } finally {
      clearInterval(heartbeat)
    }
  })
}
