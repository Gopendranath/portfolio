import type { Pool } from 'pg'

export async function markStaleStreamingMessagesFailed(
  pool: Pool,
  conversationId: string,
  now: Date = new Date(),
): Promise<void> {
  await pool.query(
    `update messages
        set status = 'failed',
            error_code = coalesce(error_code, 'STALE_STREAM'),
            error_message = coalesce(error_message, 'The response was interrupted.')
      where conversation_id = $1
        and status = 'streaming'
        and created_at < $2::timestamptz - interval '2 minutes'`,
    [conversationId, now],
  )
}
