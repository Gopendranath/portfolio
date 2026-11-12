import { TrashIcon } from '@/components/ui/icons'
import type { AssistantConversationDTO } from '@/lib/chat/protocol'
import { formatActivity } from './format-activity'

export interface AssistantHistoryRowProps {
  conversation: AssistantConversationDTO
  active: boolean
  onSelect: () => void
  onDelete: () => void
}

export function AssistantHistoryRow({
  conversation,
  active,
  onSelect,
  onDelete,
}: AssistantHistoryRowProps) {
  return (
    <li
      className={`flex items-stretch border transition-colors ${
        active ? 'border-accent bg-surface' : 'border-line bg-surface/40 hover:border-accent'
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-label={`Open chat ${conversation.title}`}
        aria-current={active ? 'true' : undefined}
        className="min-w-0 flex-1 px-3 py-3 text-left"
      >
        <span className="block truncate text-sm font-medium text-ink">{conversation.title}</span>
        <time
          dateTime={conversation.lastMessageAt}
          className="mt-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-muted"
        >
          {formatActivity(conversation.lastMessageAt)}
        </time>
      </button>
      <button
        type="button"
        aria-label={`Delete chat ${conversation.title}`}
        onClick={() => {
          if (window.confirm('Delete this chat? This cannot be undone.')) {
            onDelete()
          }
        }}
        className="flex w-10 shrink-0 items-center justify-center border-l border-line text-muted transition-colors hover:text-red-400"
      >
        <TrashIcon className="size-4" />
      </button>
    </li>
  )
}
