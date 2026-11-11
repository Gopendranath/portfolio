import avatar160 from '@/assets/avatar/avatar-160.webp'
import avatar320 from '@/assets/avatar/avatar-320.webp'
import avatar460 from '@/assets/avatar/avatar-460.webp'

interface AvatarProps {
  alt?: string
  className?: string
  sizes?: string
  priority?: boolean
}

export function Avatar({
  alt = '',
  className = '',
  sizes = '40px',
  priority = false,
}: AvatarProps) {
  return (
    <img
      src={avatar320}
      srcSet={`${avatar160} 160w, ${avatar320} 320w, ${avatar460} 460w`}
      sizes={sizes}
      width={320}
      height={320}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      className={`shrink-0 object-cover ${className}`}
    />
  )
}
