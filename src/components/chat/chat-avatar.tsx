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
      <Avatar
        alt=""
        className={`${dimensions} border border-line`}
        sizes={size === 'sm' ? '32px' : '40px'}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className={`${dimensions} flex shrink-0 items-center justify-center border border-line bg-canvas font-mono text-[10px] tracking-[0.12em] text-accent`}
    >
      AI
    </span>
  )
}
