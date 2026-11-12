import { useEffect, useRef } from 'react'
import { CloseIcon, HistoryIcon, TrashIcon } from '@/components/ui/icons'
import type { AssistantConversationDTO } from '@/lib/chat/protocol'

interface AssistantHistoryDialogProps {
  open: boolean
  conversations: readonly AssistantConversationDTO[]
  activeId: string | null
  isLoading: boolean
  error: string | null
  hasMore: boolean
  isFetchingMore: boolean
  onClose: () => void
  onNew: () => void
  onSelect: (conversationId: string) => void
  onDelete: (conversationId: string) => void
  onLoadMore: () => void
  onRetry: () => void
}

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function HistoryRow({
  conversation,
  active,
  onSelect,
  onDelete,
}: {
  conversation: AssistantConversationDTO
  active: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  return (
    <li
      className={`flex items-stretch border transition-colors ${
        active
          ? 'border-accent bg-surface'
          : 'border-line bg-surface/40 hover:border-accent'
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-label={`Open chat ${conversation.title}`}
        aria-current={active ? 'true' : undefined}
        className="min-w-0 flex-1 px-3 py-3 text-left"
      >
        <span className="block truncate text-sm font-medium text-ink">
          {conversation.title}
        </span>
        <time
          dateTime={conversation.lastMessageAt}
          className="mt-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-muted"
        >
          {timeFormatter.format(new Date(conversation.lastMessageAt))}
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

export function AssistantHistoryDialog({
  open,
  conversations,
  activeId,
  isLoading,
  error,
  hasMore,
  isFetchingMore,
  onClose,
  onNew,
  onSelect,
  onDelete,
  onLoadMore,
  onRetry,
}: AssistantHistoryDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const newChatRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) {
      return
    }

    if (open && !dialog.open) {
      dialog.showModal()
      newChatRef.current?.focus()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || 'closedBy' in HTMLDialogElement.prototype) {
      return
    }
    const element = dialog

    function handleBackdropClick(event: globalThis.MouseEvent) {
      if (event.target !== element) {
        return
      }

      const rect = element.getBoundingClientRect()
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      if (!inside) {
        onClose()
      }
    }

    element.addEventListener('click', handleBackdropClick)
    return () => {
      element.removeEventListener('click', handleBackdropClick)
    }
  }, [onClose])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="assistant-history-title"
      onClose={onClose}
      className="m-0 h-dvh max-h-none w-full max-w-none overflow-hidden overscroll-contain border-0 bg-canvas p-0 text-ink backdrop:overflow-hidden backdrop:bg-black/50 backdrop:overscroll-contain backdrop:backdrop-blur-[2px] open:flex open:flex-col md:ml-auto md:w-80"
      {...({ closedby: 'any' } as Record<string, string>)}
    >
      <header className="flex h-20 shrink-0 items-center gap-3 border-b border-line px-4">
        <span className="flex size-9 shrink-0 items-center justify-center border border-line text-accent">
          <HistoryIcon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id="assistant-history-title"
            className="truncate text-xl font-medium tracking-[-0.02em] text-ink"
          >
            Chats.
          </h2>
          <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
            Assistant history
          </p>
        </div>
        <button
          type="button"
          aria-label="Close chat history"
          onClick={onClose}
          className="flex size-8 shrink-0 items-center justify-center border border-line text-muted transition-colors hover:border-accent hover:text-accent"
        >
          <CloseIcon className="size-4" />
        </button>
      </header>

      <div className="shrink-0 border-b border-line p-4">
        <button
          ref={newChatRef}
          type="button"
          onClick={onNew}
          className="w-full bg-accent px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-accent-ink transition-colors hover:bg-ink"
        >
          New chat
        </button>
      </div>

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
          <p className="py-10 text-center text-sm text-muted">
            No previous chats yet.
          </p>
        ) : null}

        <ul className="space-y-2">
          {conversations.map((conversation) => (
            <HistoryRow
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
    </dialog>
  )
}
