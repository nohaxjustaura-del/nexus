import { cn } from '@/lib/utils'
import { BRAND_NAME } from '@/lib/brand'

type NexusWordmarkProps = {
  className?: string
  /** Tailwind height class; aligns the wordmark box with header/footer slots */
  heightClass?: string
  priority?: boolean
}

export function NexusWordmark({ className, heightClass }: NexusWordmarkProps) {
  return (
    <span
      className={cn(
        'nexus-wordmark-text inline-flex items-center font-heading text-base font-semibold tracking-tight text-foreground transition-opacity duration-200 sm:text-lg lg:text-xl',
        heightClass ?? 'min-h-9',
        className
      )}
      aria-label={BRAND_NAME}
    >
      {BRAND_NAME}
    </span>
  )
}
