import type { ChatThreadController } from '@/lib/chat/use-chat-thread'

export function ThreadError({ thread }: { thread: ChatThreadController }) {
  if (!thread.error) {
    return null
  }

  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 border-b border-line px-4 py-2 text-xs text-red-400"
    >
      <span>{thread.error}</span>
      <button
        type="button"
        onClick={() => {
          void thread.refetch()
        }}
        className="border border-line px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted"
      >
        Retry
      </button>
    </div>
  )
}
