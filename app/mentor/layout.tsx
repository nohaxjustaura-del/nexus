'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthSession } from '@/components/auth-session-provider'

function LoadingScreen() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center bg-background px-4">
      <div className="h-9 w-9 animate-pulse rounded-full bg-muted" aria-hidden />
      <span className="sr-only">Loading</span>
    </div>
  )
}

export default function MentorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { loading, authenticated, verified, user } = useAuthSession()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isMentorLandingPage = pathname === '/mentor'
  const isOnboardingPage = pathname === '/mentor/onboarding'

  useEffect(() => {
    if (!mounted || loading) return

    if (authenticated) {
      const t = (user?.userType || '').toLowerCase()
      if (t === 'vc' || t === 'investor') {
        router.push('/investor/dashboard')
        return
      }
      if (t === 'founder') {
        router.push('/founder/dashboard')
        return
      }
    }

    if (isMentorLandingPage || isOnboardingPage) return

    if (!authenticated) {
      const next = encodeURIComponent(pathname || '/mentor')
      router.push(`/signup?next=${next}`)
      return
    }
    if (!verified) {
      const next = encodeURIComponent(pathname || '/mentor')
      router.push(`/signup/thank-you?next=${next}`)
    }
  }, [
    authenticated,
    isMentorLandingPage,
    isOnboardingPage,
    loading,
    mounted,
    pathname,
    router,
    user?.userType,
    verified,
  ])

  if (!mounted) return <LoadingScreen />
  if (isMentorLandingPage || isOnboardingPage) return children
  if (loading || !authenticated || !verified) return <LoadingScreen />

  return children
}
