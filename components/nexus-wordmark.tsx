import { BRAND_NAME } from '@/lib/brand'
import { cn } from '@/lib/utils'

const SRC = '/nexus-logo.png'

type NexusWordmarkProps = {
  className?: string
  /** Tailwind height class; width follows aspect ratio */
  heightClass?: string
  priority?: boolean
}

export function NexusWordmark({ className, heightClass = 'h-14 sm:h-16', priority }: NexusWordmarkProps) {
  return (
    <img
      src={SRC}
      alt={BRAND_NAME}
      width={554}
      height={450}
      decoding="async"
      loading={priority ? 'eager' : 'lazy'}
      className={cn(
        'nexus-wordmark-img w-auto shrink-0 object-contain object-left',
        heightClass,
        className,
      )}
    />
  )
}
