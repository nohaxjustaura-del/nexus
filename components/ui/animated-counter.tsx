'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type AnimatedCounterProps = {
  value: number
  duration?: number
  prefix?: string
  suffix?: string
  className?: string
  /** Start animation when element enters viewport (default true) */
  triggerOnView?: boolean
  /** Format the number with commas */
  formatNumber?: boolean
}

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

function formatWithCommas(n: number): string {
  return n.toLocaleString('en-US')
}

export function AnimatedCounter({
  value,
  duration = 1800,
  prefix = '',
  suffix = '',
  className,
  triggerOnView = true,
  formatNumber = true,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const [hasAnimated, setHasAnimated] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!triggerOnView) {
      animate()
      return
    }

    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true)
          animate()
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, hasAnimated, triggerOnView])

  function animate() {
    const start = performance.now()

    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easeOutExpo(progress)

      setDisplayValue(Math.round(easedProgress * value))

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
  }

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const formatted = formatNumber ? formatWithCommas(displayValue) : String(displayValue)

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {prefix}{formatted}{suffix}
    </span>
  )
}
