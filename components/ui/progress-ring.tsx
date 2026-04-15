'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type ProgressRingProps = {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  className?: string
  trackClass?: string
  fillClass?: string
}

export function ProgressRing({
  value,
  max = 100,
  size = 48,
  strokeWidth = 4,
  className,
  trackClass,
  fillClass,
}: ProgressRingProps) {
  const [animatedValue, setAnimatedValue] = useState(0)
  const ref = useRef<SVGSVGElement>(null)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const percent = max > 0 ? Math.min(animatedValue / max, 1) : 0
  const offset = circumference * (1 - percent)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const start = performance.now()
          const duration = 1200

          function tick(now: number) {
            const elapsed = now - start
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setAnimatedValue(eased * value)
            if (progress < 1) requestAnimationFrame(tick)
          }

          requestAnimationFrame(tick)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [value])

  return (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn('shrink-0 -rotate-90', className)}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className={cn('text-border/40', trackClass)}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className={cn('text-primary transition-[stroke-dashoffset] duration-700 ease-out', fillClass)}
      />
    </svg>
  )
}
