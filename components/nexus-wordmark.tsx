import { BRAND_NAME } from '@/lib/brand'
import { cn } from '@/lib/utils'
import Image from 'next/image'

const SRC = '/nexus-logo.png'

type NexusWordmarkProps = {
  className?: string
  /** Tailwind height class; width follows aspect ratio */
  heightClass?: string
  priority?: boolean
}

export function NexusWordmark({ className, heightClass = 'h-16 sm:h-20', priority }: NexusWordmarkProps) {
  return (
    <Image
      src={SRC}
      alt={BRAND_NAME}
      width={1536}
      height={1024}
      priority={priority}
      loading={priority ? 'eager' : 'lazy'}
      sizes="(max-width: 640px) 10rem, (max-width: 1024px) 19rem, 24rem"
      className={cn(
        'nexus-wordmark-img block w-auto shrink-0 object-contain object-left object-top',
        heightClass,
        className,
      )}
    />
  )
}
