'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthSession } from '@/components/auth-session-provider'

const subscribeToNothing = () => () => {}

function useIsClient() {
  return useSyncExternalStore(subscribeToNothing, () => true, () => false)
}

function FounderGateLoading() {
  return (
    <div
      className="flex min-h-[50vh] items-center justify-center bg-background px-4"
      role="status"
      aria-busy="true"
      aria-label="Loading founder workspace"
    >
      <div className="h-9 w-9 animate-pulse rounded-full bg-muted" aria-hidden />
    </div>
  )
}

export default function FounderLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const isClient = useIsClient()
  const { loading, authenticated, verified, user, isAdmin } = useAuthSession()

  const isOnboardingPage = pathname === '/founder/onboarding'
  const isDiscoverPage = pathname === '/founder/discover' || pathname?.startsWith('/founder/discover/')
  /** Public marketing entry (same gate as discover: browse before account). */
  const isFounderLandingPage = pathname === '/founder'

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
    if (!isClient || loading) return

    if (authenticated && !isAdmin) {
      const t = (user?.userType || '').toLowerCase()
      if (t === 'vc' || t === 'investor') {
        router.replace('/investor/dashboard')
        return
      }
      if (t === 'mentor') {
        router.replace('/mentor/dashboard')
        return
      }
    }

    if (isOnboardingPage || isDiscoverPage || isFounderLandingPage) return

    if (!authenticated) {
      const ret = encodeURIComponent(pathname || '/founder')
      router.replace(`/signup?next=${ret}`)
      return
    }
    if (!verified) {
      const ret = encodeURIComponent(pathname || '/founder')
      router.replace(`/signup/thank-you?next=${ret}`)
    }
  }, [
    isClient,
    loading,
    authenticated,
    verified,
    pathname,
    isOnboardingPage,
    isDiscoverPage,
    isFounderLandingPage,
    router,
    user?.userType,
    isAdmin,
  ])

  if (!isClient) {
    return <FounderGateLoading />
  }

  if (isOnboardingPage || isDiscoverPage || isFounderLandingPage) {
    return children
  }

  if (loading || !authenticated || !verified) {
    return <FounderGateLoading />
  }

  return children
}
