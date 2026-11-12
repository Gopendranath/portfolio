import type { ReactNode } from 'react'
import { ChatAvatar } from '@/components/chat/chat-avatar'
import { ChatHeader } from '@/components/chat/chat-header'
import { HistoryIcon } from '@/components/ui/icons'
import type { ChatProfile } from '@/data/types'

export interface ChatThreadFrameProps {
  profile: ChatProfile
  showHistory: boolean
  onOpenHistory: () => void
  children: ReactNode
}

export function ChatThreadFrame({
  profile,
  showHistory,
  onOpenHistory,
  children,
}: ChatThreadFrameProps) {
  return (
    <section
      id="chat-thread"
      aria-labelledby="chat-thread-title"
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <ChatHeader
        className="chat-thread-header hidden md:flex"
        titleId="chat-thread-title"
        title={profile.name}
        subtitle={profile.role}
        avatar={<ChatAvatar profile={profile} />}
        actions={
          showHistory ? (
            <button
              type="button"
              aria-label="Chat history"
              onClick={onOpenHistory}
              className="flex size-8 items-center justify-center border border-line text-muted transition-colors hover:border-accent hover:text-accent"
            >
              <HistoryIcon className="size-4" />
            </button>
          ) : undefined
        }
      />
      {showHistory ? (
        <button
          type="button"
          aria-label="Chat history"
          onClick={onOpenHistory}
          className="absolute left-3 top-3 z-10 flex size-9 items-center justify-center border border-line bg-canvas/90 text-muted shadow-sm backdrop-blur transition-colors hover:border-accent hover:text-accent md:hidden"
        >
          <HistoryIcon className="size-4" />
        </button>
      ) : null}
      {children}
    </section>
  )
}
