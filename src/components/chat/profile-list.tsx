import type { ReactNode } from 'react'
import type { ChatProfile, ChatProfileId } from '@/data/types'
import { ChatAvatar } from './chat-avatar'
import { ChatNavCard } from './chat-nav-card'

interface ProfileListProps {
  profiles: readonly ChatProfile[]
  activeProfileId: ChatProfileId
  badges?: Partial<Record<ChatProfileId, number>>
  children?: ReactNode
  onSelect: (id: ChatProfileId) => void
}

export function ProfileList({
  profiles,
  activeProfileId,
  badges,
  children,
  onSelect,
}: ProfileListProps) {
  return (
    <fieldset
      aria-label="Chat profiles"
      className="m-0 grid min-w-0 grid-cols-2 gap-2 border-0 p-0 md:grid-cols-1"
    >
      {profiles.map((profile) => (
        <ChatNavCard
          key={profile.id}
          avatar={<ChatAvatar profile={profile} size="sm" />}
          title={profile.name}
          subtitle={profile.role}
          pressed={profile.id === activeProfileId}
          badge={badges?.[profile.id]}
          ariaControls="chat-thread"
          onClick={() => onSelect(profile.id)}
        />
      ))}
      {children}
    </fieldset>
  )
}
