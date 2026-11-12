import type { Pool } from 'pg'
import { z } from 'zod'
import type {
  AssistantConversationDTO,
  AssistantConversationPage,
} from '../../src/lib/chat/protocol'
import { ApiError } from './errors'

const HISTORY_LIMIT = 20
const MAX_HISTORY_LIMIT = 50

const historyCursorSchema = z.object({
  lastMessageAtUs: z.string().regex(/^\d+$/),
  id: z.string().uuid(),
})

interface ConversationRow {
  id: string
  title: string | null
  created_at: Date
  last_message_at: Date
  last_message_at_us: string
}

function toConversationDTO(row: ConversationRow): AssistantConversationDTO {
  return {
    id: row.id,
    title: row.title ?? 'Earlier conversation',
    createdAt: row.created_at.toISOString(),
    lastMessageAt: row.last_message_at.toISOString(),
  }
}

function encodeCursor(row: ConversationRow): string {
  return Buffer.from(
    JSON.stringify({
      lastMessageAtUs: row.last_message_at_us,
      id: row.id,
    }),
  ).toString('base64url')
}

function decodeCursor(value: string): { lastMessageAtUs: string; id: string } {
  let decoded: unknown
  try {
    decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
  } catch {
    throw new ApiError('VALIDATION', 'Invalid history cursor', 400)
  }

  const parsed = historyCursorSchema.safeParse(decoded)
  if (!parsed.success) {
    throw new ApiError('VALIDATION', 'Invalid history cursor', 400)
  }
  return parsed.data
}

export function titleFromBody(body: string): string {
  const normalized = body.replace(/\s+/g, ' ').trim()
  const title = Array.from(normalized).slice(0, 80).join('')
  return title || 'New chat'
}

export async function createAssistantConversation(
  pool: Pool,
  userId: string,
): Promise<{ id: string }> {
  const { rows } = await pool.query<{ id: string }>(
    `insert into conversations (user_id, kind)
     values ($1, 'assistant')
     returning id`,
    [userId],
  )

  const row = rows[0]
  if (!row) {
    throw new ApiError('INTERNAL', 'Could not create the conversation')
  }
  return row
}

export async function getLatestAssistantConversation(
  pool: Pool,
  userId: string,
): Promise<{ id: string } | null> {
  const { rows } = await pool.query<{ id: string }>(
    `select id
       from conversations
      where user_id = $1
        and kind = 'assistant'
      order by last_message_at desc, id desc
      limit 1`,
    [userId],
  )
  return rows[0] ?? null
}

export async function findAssistantConversationByClientId(
  pool: Pool,
  userId: string,
  clientId: string,
): Promise<{ id: string } | null> {
  const { rows } = await pool.query<{ id: string }>(
    `select c.id
       from messages m
       join conversations c on c.id = m.conversation_id
      where m.client_id = $2
        and c.user_id = $1
        and c.kind = 'assistant'
      order by m.seq desc
      limit 1`,
    [userId, clientId],
  )
  return rows[0] ?? null
}

export async function getOwnedAssistantConversation(
  pool: Pool,
  userId: string,
  conversationId: string,
): Promise<{ id: string }> {
  const { rows } = await pool.query<{ id: string }>(
    `select id
       from conversations
      where id = $1
        and user_id = $2
        and kind = 'assistant'`,
    [conversationId, userId],
  )

  const row = rows[0]
  if (!row) {
    throw new ApiError('NOT_FOUND', 'Conversation not found')
  }
  return row
}

function isMissingTitleColumn(error: unknown): boolean {
  return (error as { code?: string }).code === '42703'
}

export async function setAssistantTitleIfEmpty(
  pool: Pool,
  conversationId: string,
  body: string,
): Promise<void> {
  try {
    await pool.query(
      `update conversations
          set title = $2
        where id = $1
        and kind = 'assistant'
        and title is null`,
      [conversationId, titleFromBody(body)],
    )
  } catch (error) {
    // Rolling deploy: the new function can run before migration 004.
    if (!isMissingTitleColumn(error)) {
      throw error
    }
  }
}

export async function retitleAssistantConversation(
  pool: Pool,
  conversationId: string,
  messageSeq: number,
  body: string,
): Promise<void> {
  try {
    await pool.query(
      `update conversations c
          set title = $3
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
      [conversationId, messageSeq, titleFromBody(body)],
    )
  } catch (error) {
    if (!isMissingTitleColumn(error)) {
      throw error
    }
  }
}

export async function listAssistantConversations(
  pool: Pool,
  userId: string,
  options: { limit?: number; before?: string } = {},
): Promise<AssistantConversationPage> {
  const limit = Math.min(
    Math.max(options.limit ?? HISTORY_LIMIT, 1),
    MAX_HISTORY_LIMIT,
  )
  const cursor = options.before ? decodeCursor(options.before) : null

  const { rows } = await pool.query<ConversationRow>(
    `select c.id, c.title, c.created_at, c.last_message_at,
            (extract(epoch from c.last_message_at) * 1000000)::bigint::text
              as last_message_at_us
       from conversations c
      where c.user_id = $1
        and c.kind = 'assistant'
        and exists (
          select 1
            from messages m
           where m.conversation_id = c.id
             and m.deleted_at is null
             and m.status <> 'superseded'
        )
        and (
          $2::bigint is null
          or (
            extract(epoch from c.last_message_at) * 1000000
          )::bigint < $2::bigint
          or (
            (extract(epoch from c.last_message_at) * 1000000)::bigint = $2::bigint
            and c.id < $3::uuid
          )
        )
      order by c.last_message_at desc, c.id desc
      limit $4`,
    [userId, cursor?.lastMessageAtUs ?? null, cursor?.id ?? null, limit + 1],
  )

  const hasMore = rows.length > limit
  const pageRows = rows.slice(0, limit)
  const last = pageRows.at(-1)

  return {
    conversations: pageRows.map(toConversationDTO),
    hasMore,
    nextCursor: hasMore && last ? encodeCursor(last) : null,
  }
}

export async function deleteAssistantConversation(
  pool: Pool,
  userId: string,
  conversationId: string,
): Promise<void> {
  const { rows } = await pool.query<{ id: string }>(
    `delete from conversations
      where id = $1
        and user_id = $2
        and kind = 'assistant'
      returning id`,
    [conversationId, userId],
  )

  if (!rows[0]) {
    throw new ApiError('NOT_FOUND', 'Conversation not found')
  }
}
