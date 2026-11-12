import { chatProfiles, chatProfilesById } from '@/data/chat'
import type { ChatProfileId } from '@/data/types'
import { ChatNavCard } from './chat-nav-card'
import { ProfileList } from './profile-list'

interface ChatProfilePanelProps {
  isOwner: boolean
  signedIn: boolean
  activeView: ChatProfileId
  ownerUnreadCount: number
  githubLogin: string | null
  onSelect: (id: ChatProfileId) => void
  onOpenInbox: () => void
  onSignOut: () => void
}

export function ChatProfilePanel({
  isOwner,
  signedIn,
  activeView,
  ownerUnreadCount,
  githubLogin,
  onSelect,
  onOpenInbox,
  onSignOut,
}: ChatProfilePanelProps) {
  const profiles = isOwner ? [chatProfilesById.assistant] : chatProfiles
  const badges = !isOwner && ownerUnreadCount > 0 ? { owner: ownerUnreadCount } : undefined

  return (
    <div className="chat-profile-panel flex shrink-0 flex-col border-b border-line p-4 md:border-b-0 md:border-r">
      <div className="chat-profile-heading shrink-0">
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-accent">05 / Chat</p>
        <h1 className="mt-1 text-xl font-medium tracking-[-0.02em] text-ink">Chat.</h1>
      </div>

      <div className="chat-profile-list mt-4 space-y-2">
        <ProfileList
          profiles={profiles}
          activeProfileId={activeView}
          badges={badges}
          onSelect={onSelect}
        >
          {isOwner ? (
            <ChatNavCard
              avatar={
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center border border-line bg-canvas font-mono text-[9px] uppercase tracking-[0.12em] text-accent"
                >
                  IN
                </span>
              }
              title="Inbox"
              subtitle="Owner messages"
              onClick={onOpenInbox}
            />
          ) : null}
        </ProfileList>
      </div>

      {signedIn ? (
        <div className="mt-auto hidden pt-4 md:block">
          <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
            {githubLogin ?? 'Signed in'}
          </p>
          <button
            type="button"
            onClick={onSignOut}
            className="mt-2 border border-line px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted transition-colors hover:border-accent hover:text-accent"
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  )
}
