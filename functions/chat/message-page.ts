import type { Pool } from 'pg'
import type { MessagePage } from '../../src/lib/chat/protocol'
import { listMessages } from './messages'
import { markStaleStreamingMessagesFailed } from './stale-streams'

export async function getMessagePage(
  pool: Pool,
  conversationId: string,
  options: { beforeSeq?: number; limit?: number } = {},
): Promise<MessagePage> {
  await markStaleStreamingMessagesFailed(pool, conversationId)
  return listMessages(pool, conversationId, options)
}
