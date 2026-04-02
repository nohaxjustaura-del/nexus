import { BRAND_NAME } from '@/lib/brand'
import { cn } from '@/lib/utils'

const SRC = '/nexus-logo.png'

type NexusWordmarkProps = {
  className?: string
  /** Tailwind height class; width follows aspect ratio */
  heightClass?: string
  priority?: boolean
}

export function NexusWordmark({ className, heightClass = 'h-28 sm:h-32', priority }: NexusWordmarkProps) {
  return (
    <img
      src={SRC}
      alt={BRAND_NAME}
      width={1536}
      height={1024}
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
