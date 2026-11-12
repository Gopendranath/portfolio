import { z } from 'zod'

export const MAX_MESSAGE_LENGTH = 2000
export const MAX_AI_OUTPUT_CHARS = 6000
export const AI_CONTEXT_MESSAGE_LIMIT = 20
export const AI_CONTEXT_CHAR_LIMIT = 12_000
export const PAGE_SIZE = 10

export class ChatValidationError extends Error {
  readonly code = 'VALIDATION'

  constructor(message: string) {
    super(message)
    this.name = 'ChatValidationError'
  }
}

function hasControlCharacters(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0
    if (
      (code >= 0 && code <= 8) ||
      code === 11 ||
      code === 12 ||
      (code >= 14 && code <= 31) ||
      code === 127
    ) {
      return true
    }
  }

  return false
}

export function normalizeBody(input: string): string {
  const normalized = input.normalize('NFC').trim()

  if (!normalized) {
    throw new ChatValidationError('Message is required')
  }

  if (hasControlCharacters(normalized)) {
    throw new ChatValidationError('Message contains control characters')
  }

  if (Array.from(normalized).length > MAX_MESSAGE_LENGTH) {
    throw new ChatValidationError(
      `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer`,
    )
  }

  return normalized
}

const bodySchema = z.string().transform((value, context) => {
  try {
    return normalizeBody(value)
  } catch (error) {
    context.addIssue({
      code: 'custom',
      message: error instanceof Error ? error.message : 'Invalid message',
    })
    return z.NEVER
  }
})

const clientIdSchema = z
  .string()
  .min(16)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/, 'clientId must be URL-safe')

export const sendMessageSchema = z.object({
  body: bodySchema,
  clientId: clientIdSchema,
})

export const editMessageSchema = z.object({
  body: bodySchema,
})

export const ownerRetrySchema = sendMessageSchema

export const assistantRetrySchema = z.object({
  assistantMessageId: z.string().uuid(),
})

export const assistantEditSchema = z.object({
  messageId: z.string().uuid(),
  body: bodySchema,
})

export const paginationSchema = z.object({
  limit: z.preprocess(
    (value) => (value === undefined || value === '' ? PAGE_SIZE : value),
    z.coerce.number().int().min(1).max(PAGE_SIZE),
  ),
  before: z.preprocess(
    (value) => (value === undefined || value === '' ? undefined : value),
    z.coerce.number().int().positive().optional(),
  ),
})

export const threadPaginationSchema = z.object({
  limit: z.preprocess(
    (value) => (value === undefined || value === '' ? 20 : value),
    z.coerce.number().int().min(1).max(20),
  ),
  before: z.string().optional(),
})

export const chatKindSchema = z.enum(['owner', 'assistant'])

export const assistantSendSchema = sendMessageSchema.extend({
  conversationId: z.string().uuid().optional(),
})

export const assistantMessagesQuerySchema = paginationSchema.extend({
  conversationId: z.string().uuid(),
})

export const assistantHistoryQuerySchema = z.object({
  limit: z.preprocess(
    (value) => (value === undefined || value === '' ? 20 : value),
    z.coerce.number().int().min(1).max(50),
  ),
  before: z.preprocess(
    (value) => (value === undefined || value === '' ? undefined : value),
    z.string().min(1).max(512).optional(),
  ),
})

export type ChatKind = z.infer<typeof chatKindSchema>
export type SendMessageInput = z.infer<typeof sendMessageSchema>
export type EditMessageInput = z.infer<typeof editMessageSchema>
export type PaginationInput = z.infer<typeof paginationSchema>
export type ThreadPaginationInput = z.infer<typeof threadPaginationSchema>

export type ChatAuthor = 'user' | 'owner' | 'assistant'
export type MessageStatus = 'complete' | 'streaming' | 'failed' | 'superseded'
export type ChatMessageViewStatus = MessageStatus | 'sending'

export interface ChatMessageDTO {
  id: string
  seq: number
  conversationId: string
  author: ChatAuthor
  body: string
  status: MessageStatus
  clientId: string | null
  sentAt: string
  editedAt: string | null
  errorCode: string | null
}

export interface MessagePage {
  messages: ChatMessageDTO[]
  hasMore: boolean
  nextCursor: number | null
}

export interface OwnerThreadDTO {
  conversationId: string
  userId: string
  githubLogin: string | null
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
}

export interface OwnerThreadPage {
  threads: OwnerThreadDTO[]
  hasMore: boolean
  nextCursor: string | null
}

export interface AssistantConversationDTO {
  id: string
  title: string
  createdAt: string
  lastMessageAt: string
}

export interface AssistantConversationPage {
  conversations: AssistantConversationDTO[]
  hasMore: boolean
  nextCursor: string | null
}

export type SSEEvent =
  | {
      event: 'meta'
      data: {
        conversationId: string
        userMessageId: string
        assistantMessageId: string
      }
    }
  | { event: 'delta'; data: { text: string } }
  | {
      event: 'done'
      data: {
        assistantMessageId: string
        finishReason: string | null
        truncated: boolean
        outputTokens: number | null
      }
    }
  | {
      event: 'error'
      data: { code: string; message: string; retryable: boolean }
    }

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    retryable: boolean
  }
}
