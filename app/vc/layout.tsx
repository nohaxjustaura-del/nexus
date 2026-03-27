'use client'

import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export default function VCLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isClaim = pathname === '/vc/claim' || pathname?.startsWith('/vc/claim/')

  return (
    <div className={cn('min-h-screen bg-background text-foreground antialiased', isClaim && 'relative')}>
      {children}
    </div>
  )
}
