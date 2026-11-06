import type { ChatProfile } from '../../data/types'
import { Avatar } from '../ui/avatar'

interface ChatAvatarProps {
  profile: ChatProfile
  size?: 'sm' | 'md'
}

export function ChatAvatar({ profile, size = 'md' }: ChatAvatarProps) {
  const dimensions = size === 'sm' ? 'size-8' : 'size-10'

  if (profile.id === 'owner') {
    return (
      <span
        className={`avatar-frame relative block shrink-0 overflow-hidden border border-line ${dimensions}`}
      >
        <Avatar
          alt=""
          className="size-full"
          sizes={size === 'sm' ? '32px' : '40px'}
        />
      </span>
    )
  }

  return (
    <span
      aria-hidden="true"
      className={`avatar-frame relative flex shrink-0 items-center justify-center overflow-hidden border border-line bg-canvas font-mono text-[10px] tracking-[0.12em] text-accent ${dimensions}`}
    >
      AI
    </span>
  )
}
