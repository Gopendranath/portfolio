import { useMemo, useState } from 'react'
import type { OwnerThreadDTO } from '@/lib/chat/protocol'
import { useOwnerThreads } from '@/lib/chat/use-owner-inbox'
import { ChatHeader } from './chat-header'
import { OwnerThreadView } from './owner-thread-view'

interface OwnerInboxProps {
  onBack: () => void
}

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export function OwnerInbox({ onBack }: OwnerInboxProps) {
  const threadsQuery = useOwnerThreads(true)
  const [selected, setSelected] = useState<OwnerThreadDTO | null>(null)

  const threads = useMemo(
    () => threadsQuery.data?.pages.flatMap((page) => page.threads) ?? [],
    [threadsQuery.data],
  )

  if (selected) {
    return (
      <OwnerThreadView
        key={selected.userId}
        thread={selected}
        onBack={() => setSelected(null)}
        onMarkedUnread={() => setSelected(null)}
      />
    )
  }

  return (
    <section
      aria-label="Owner inbox"
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <ChatHeader
        className="flex"
        level={1}
        title="Inbox."
        subtitle="Owner messages only"
        onBack={onBack}
        backLabel="Back to assistant"
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {threadsQuery.isLoading ? (
          <div className="space-y-2">
            <div className="h-16 animate-pulse border border-line bg-surface/40" />
            <div className="h-16 animate-pulse border border-line bg-surface/40" />
          </div>
        ) : null}

        {!threadsQuery.isLoading && threads.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">
            No owner messages yet.
          </p>
        ) : null}

        <div className="space-y-2">
          {threads.map((item) => (
            <button
              key={item.userId}
              type="button"
              onClick={() => setSelected(item)}
              className="flex w-full items-start gap-3 border border-line bg-surface/40 p-3 text-left transition-colors hover:border-accent"
            >
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center border border-line bg-canvas font-mono text-[9px] uppercase tracking-[0.12em] text-accent">
                {item.githubLogin?.slice(0, 2).toUpperCase() ?? 'GH'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-medium text-ink">
                    {item.githubLogin ?? 'GitHub user'}
                  </span>
                  <time
                    dateTime={item.lastMessageAt}
                    className="shrink-0 font-mono text-[9px] tracking-[0.12em] text-muted"
                  >
                    {timeFormatter.format(new Date(item.lastMessageAt))}
                  </time>
                </span>
                <span className="mt-1 block truncate text-xs text-muted">
                  {item.lastMessage}
                </span>
              </span>
              {item.unreadCount > 0 ? (
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent font-mono text-[9px] text-accent-ink">
                  {item.unreadCount}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {threadsQuery.hasNextPage ? (
          <button
            type="button"
            onClick={() => {
              void threadsQuery.fetchNextPage()
            }}
            disabled={threadsQuery.isFetchingNextPage}
            className="mt-4 w-full border border-line px-3 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted transition-colors hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-50"
          >
            {threadsQuery.isFetchingNextPage ? 'Loading…' : 'Load more threads'}
          </button>
        ) : null}
      </div>
    </section>
  )
}
