import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

export const OPENROUTER_MODEL = 'openrouter/free'
export const OPENROUTER_MAX_TOKENS = 1200

export interface AssistantDelta {
  text: string
  outputTokens?: number
}

export interface OpenRouterGateway {
  stream(
    messages: ChatCompletionMessageParam[],
    signal?: AbortSignal,
  ): AsyncIterable<AssistantDelta>
}

export function createOpenRouterGateway(): OpenRouterGateway {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured')
  }

  const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    defaultHeaders: {
      'HTTP-Referer': 'https://gopendra.is-a.dev',
      'X-OpenRouter-Title': 'Gopendranath Portfolio Chat',
    },
  })

  return {
    async *stream(messages, signal) {
      const stream = await client.chat.completions.create(
        {
          model: OPENROUTER_MODEL,
          messages,
          stream: true,
          max_tokens: OPENROUTER_MAX_TOKENS,
          stream_options: { include_usage: true },
        },
        { signal },
      )

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? ''
        const outputTokens = chunk.usage?.completion_tokens

        if (text || outputTokens) {
          yield { text, outputTokens }
        }
      }
    },
  }
}
