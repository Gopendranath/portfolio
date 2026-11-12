import type { ChatAuthor, ChatMessageDTO } from '../../src/lib/chat/protocol'

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
