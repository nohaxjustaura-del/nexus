'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthSession } from '@/components/auth-session-provider'
import { cn } from '@/lib/utils'

export default function VCLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { loading, authenticated, verified, user } = useAuthSession()
  const isClaim = pathname === '/vc/claim' || pathname?.startsWith('/vc/claim/')
  const t = (user?.userType || '').toLowerCase()
  const isInvestorRole = t === 'vc' || t === 'investor'

  useEffect(() => {
    if (loading) return
    if (!authenticated) {
      const next = encodeURIComponent(pathname || '/vc/dashboard')
      router.push(`/signup?next=${next}`)
      return
    }

    if (t !== 'vc' && t !== 'investor') {
      if (t === 'mentor') router.push('/mentor/dashboard')
      else router.push('/investor')
      return
    }

    if (!verified) {
      const next = encodeURIComponent(pathname || '/vc/dashboard')
      router.push(`/signup/thank-you?next=${next}`)
    }
  }, [authenticated, loading, pathname, router, t, verified])

  if (loading || !authenticated || !verified || !isInvestorRole) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-background px-4">
        <div className="h-9 w-9 animate-pulse rounded-full bg-muted" aria-hidden />
        <span className="sr-only">Loading</span>
      </div>
    )
  }

  return (
    <div className={cn('min-h-screen bg-background text-foreground antialiased', isClaim && 'relative')}>
      {children}
    </div>
  )
}
