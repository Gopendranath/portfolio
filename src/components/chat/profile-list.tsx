import type { ChatProfile, ChatProfileId } from '@/data/types'
import { ChatAvatar } from './chat-avatar'

interface ProfileListProps {
  profiles: readonly ChatProfile[]
  activeProfileId: ChatProfileId
  onSelect: (id: ChatProfileId) => void
}

export function ProfileList({
  profiles,
  activeProfileId,
  onSelect,
}: ProfileListProps) {
  return (
    <fieldset
      aria-label="Chat profiles"
      className="m-0 grid min-w-0 grid-cols-2 gap-2 border-0 p-0 md:grid-cols-1"
    >
      {profiles.map((profile) => {
        const isActive = profile.id === activeProfileId

        return (
          <button
            key={profile.id}
            type="button"
            aria-pressed={isActive}
            aria-controls="chat-thread"
            onClick={() => onSelect(profile.id)}
            className={`relative flex min-w-0 items-center gap-2.5 border p-3 text-left transition-colors ${
              isActive
                ? 'border-line bg-surface/70'
                : 'border-transparent hover:border-line hover:bg-surface/40'
            }`}
          >
            <span
              aria-hidden="true"
              className={`absolute inset-y-0 left-0 w-px transition-colors ${
                isActive ? 'bg-accent' : 'bg-transparent'
              }`}
            />
            <span className="hidden shrink-0 min-[390px]:block">
              <ChatAvatar profile={profile} size="sm" />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-medium leading-tight text-ink md:text-sm">
                {profile.name}
              </span>
              <span className="mt-1 block font-mono text-[9px] uppercase leading-tight tracking-[0.14em] text-muted">
                {profile.role}
              </span>
            </span>
          </button>
        )
      })}
    </fieldset>
  )
}
