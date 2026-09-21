import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { initialsOf } from '@/lib/names'
import { cn } from '@/lib/utils'

// Re-exported for existing imports; the rules for titles live in lib/names.
export { initialsOf }

interface UserAvatarProps {
  name: string
  src?: string | null
  /** Tailwind classes for the gradient shown when there is no image. */
  fallbackClassName?: string
  className?: string
}

/**
 * A person's avatar: their uploaded picture when they have one, their initials
 * otherwise. Radix falls back on its own if the image fails to load.
 */
export function UserAvatar({
  name,
  src,
  fallbackClassName,
  className,
}: UserAvatarProps) {
  return (
    <Avatar className={className}>
      {src && <AvatarImage src={src} alt={name} />}
      <AvatarFallback
        className={cn(
          'bg-gradient-to-br text-xs font-semibold text-white',
          fallbackClassName ?? 'from-blue-500 to-indigo-600'
        )}
      >
        {initialsOf(name)}
      </AvatarFallback>
    </Avatar>
  )
}
