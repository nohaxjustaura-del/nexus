'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthSession } from '@/components/auth-session-provider'
import { Loader2 } from 'lucide-react'

export default function InvestorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const { loading, authenticated, verified, user, isAdmin } = useAuthSession()

  useEffect(() => { setMounted(true) }, [])

  const isOnboardingPage = pathname === '/investor/onboarding'

  useEffect(() => {
    if (!mounted || loading) return

    if (authenticated && !isAdmin) {
      const t = (user?.userType || '').toLowerCase()
      if (t === 'mentor') {
        router.push('/mentor/dashboard')
        return
      }
      if (t && t !== 'vc' && t !== 'investor') {
        router.push('/investor')
        return
      }
    }

    if (isOnboardingPage) return

    if (!authenticated) {
      router.push(`/signup?redirect=${encodeURIComponent('/investor/onboarding')}`)
      return
    }
    if (!verified) {
      router.push(`/signup/thank-you?next=${encodeURIComponent('/investor/onboarding')}`)
    }
  }, [mounted, loading, authenticated, verified, pathname, isOnboardingPage, router, user?.userType, isAdmin])

  if (!mounted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-background px-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-muted" aria-hidden />
        </div>
      </div>
    )
  }

  if (isOnboardingPage) return children

  if (loading || !authenticated || !verified) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-background px-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    )
  }

  return children
}
