import { AiLockedPanel } from '@/components/chat/ai-locked-panel'
import { AuthPanel } from '@/components/chat/auth-panel'
import { chatProfilesById } from '@/data/chat'
import type { ChatProfileId } from '@/data/types'
import type { ChatThreadController } from '@/lib/chat/use-chat-thread'
import { ChatThreadFrame } from './chat-thread-frame'
import { SignedInThread } from './signed-in-thread'

interface ChatThreadPanelProps {
  view: ChatProfileId
  isOwner: boolean
  signedIn: boolean
  sessionLoading: boolean
  sessionError: string | null
  aiEligible: boolean
  aiReason: string
  thread: ChatThreadController
  draft: string
  notice: string | null
  showHistory: boolean
  onDraftChange: (value: string) => void
  onSend: () => void
  onSignIn: () => Promise<void>
  onOpenOwner: () => void
  onOpenHistory: () => void
}

export function ChatThreadPanel({
  view,
  isOwner,
  signedIn,
  sessionLoading,
  sessionError,
  aiEligible,
  aiReason,
  thread,
  draft,
  notice,
  showHistory,
  onDraftChange,
  onSend,
  onSignIn,
  onOpenOwner,
  onOpenHistory,
}: ChatThreadPanelProps) {
  const profile = chatProfilesById[view]
  const aiLocked = view === 'assistant' && !aiEligible
  const historyAvailable = showHistory && signedIn && !aiLocked

  if (!signedIn) {
    return (
      <ChatThreadFrame profile={profile} showHistory={false} onOpenHistory={onOpenHistory}>
        <AuthPanel isLoading={sessionLoading} error={sessionError} onSignIn={onSignIn} />
      </ChatThreadFrame>
    )
  }

  if (aiLocked) {
    return (
      <ChatThreadFrame profile={profile} showHistory={false} onOpenHistory={onOpenHistory}>
        <AiLockedPanel reason={aiReason} onOpenOwner={onOpenOwner} />
      </ChatThreadFrame>
    )
  }

  return (
    <ChatThreadFrame profile={profile} showHistory={historyAvailable} onOpenHistory={onOpenHistory}>
      <SignedInThread
        view={view}
        isOwner={isOwner}
        thread={thread}
        draft={draft}
        notice={notice}
        onDraftChange={onDraftChange}
        onSend={onSend}
      />
    </ChatThreadFrame>
  )
}
