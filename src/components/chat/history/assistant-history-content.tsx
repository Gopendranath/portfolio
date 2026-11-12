import type { AssistantConversationDTO } from '@/lib/chat/protocol'
import { AssistantHistoryRow } from './assistant-history-row'

export interface AssistantHistoryContentProps {
  conversations: readonly AssistantConversationDTO[]
  activeId: string | null
  isLoading: boolean
  error: string | null
  hasMore: boolean
  isFetchingMore: boolean
  onSelect: (conversationId: string) => void
  onDelete: (conversationId: string) => void
  onLoadMore: () => void
  onRetry: () => void
}

export function AssistantHistoryContent({
  conversations,
  activeId,
  isLoading,
  error,
  hasMore,
  isFetchingMore,
  onSelect,
  onDelete,
  onLoadMore,
  onRetry,
}: AssistantHistoryContentProps) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
      {isLoading ? (
        <div className="space-y-2" role="status" aria-label="Loading chats">
          <div className="h-14 animate-pulse border border-line bg-surface/40" />
          <div className="h-14 animate-pulse border border-line bg-surface/40" />
        </div>
      ) : null}

      {!isLoading && error ? (
        <div className="border border-line p-3 text-xs text-red-400">
          <p>{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 border border-line px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted transition-colors hover:border-accent hover:text-accent"
          >
            Retry
          </button>
        </div>
      ) : null}

      {!isLoading && !error && conversations.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">No previous chats yet.</p>
      ) : null}

      <ul className="space-y-2">
        {conversations.map((conversation) => (
          <AssistantHistoryRow
            key={conversation.id}
            conversation={conversation}
            active={conversation.id === activeId}
            onSelect={() => onSelect(conversation.id)}
            onDelete={() => onDelete(conversation.id)}
          />
        ))}
      </ul>

      {hasMore ? (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={isFetchingMore}
          className="mt-4 w-full border border-line px-3 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted transition-colors hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-50"
        >
          {isFetchingMore ? 'Loading…' : 'Load more chats'}
        </button>
      ) : null}
    </div>
  )
}
