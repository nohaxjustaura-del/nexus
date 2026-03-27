'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthSession } from '@/components/auth-session-provider'

export default function FounderLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const { loading, authenticated, verified } = useAuthSession()

  useEffect(() => {
    setMounted(true)
  }, [])

  const isOnboardingPage = pathname === '/founder/onboarding'
  const isDiscoverPage = pathname === '/founder/discover' || pathname?.startsWith('/founder/discover/')

  useEffect(() => {
    const isOnboarding = pathname === '/founder/onboarding'
    if (!isOnboarding) return

    const originalPush = router.push
    const originalReplace = router.replace

    router.push = function (href: string, options?: object) {
      if (String(href).includes('discover')) {
        console.warn('[FOUNDER-LAYOUT] Blocked redirect to discover from layout')
        return Promise.resolve(false)
      }
      return originalPush.call(router, href, options)
    }

    router.replace = function (href: string, options?: object) {
      if (String(href).includes('discover')) {
        console.warn('[FOUNDER-LAYOUT] Blocked redirect to discover from layout')
        return Promise.resolve(false)
      }
      return originalReplace.call(router, href, options)
    }

    return () => {
      router.push = originalPush
      router.replace = originalReplace
    }
  }, [router, pathname])

  useEffect(() => {
    if (!mounted || isOnboardingPage || isDiscoverPage || loading) return
    if (!authenticated) {
      const ret = encodeURIComponent(pathname || '/founder')
      router.push(`/signup?next=${ret}`)
      return
    }
    if (!verified) {
      const ret = encodeURIComponent(pathname || '/founder')
      router.push(`/signup/thank-you?next=${ret}`)
    }
  }, [mounted, loading, authenticated, verified, pathname, isOnboardingPage, isDiscoverPage, router])

  if (!mounted) {
    return (
      <div
        suppressHydrationWarning
        className="flex min-h-[50vh] items-center justify-center bg-background px-4"
      >
        <div
          suppressHydrationWarning
          className="h-9 w-9 animate-pulse rounded-full bg-muted"
          aria-hidden
        />
        <span className="sr-only">Loading</span>
      </div>
    )
  }

  if (isOnboardingPage || isDiscoverPage) {
    return children
  }

  if (loading || !authenticated || !verified) {
    return (
      <div
        suppressHydrationWarning
        className="flex min-h-[50vh] items-center justify-center bg-background px-4"
      >
        <div
          suppressHydrationWarning
          className="h-9 w-9 animate-pulse rounded-full bg-muted"
          aria-hidden
        />
        <span className="sr-only">Loading</span>
      </div>
    )
  }

  return children
}
