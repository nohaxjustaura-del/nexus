'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function FounderLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)

  // CRITICAL: Block ALL redirects when on onboarding - do this immediately
  useEffect(() => {
    const isOnboardingPage = pathname === '/founder/onboarding'
    if (!isOnboardingPage) return
    
    // Block router methods
    const originalPush = router.push
    const originalReplace = router.replace
    
    router.push = function(href: string, options?: any) {
      if (String(href).includes('discover')) {
        console.warn('[FOUNDER-LAYOUT] Blocked redirect to discover from layout')
        return Promise.resolve(false)
      }
      return originalPush.call(router, href, options)
    }
    
    router.replace = function(href: string, options?: any) {
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
    let cancelled = false
    
    // CRITICAL: If we're on onboarding page, IMMEDIATELY allow access - don't check anything
    // This prevents any redirects from happening before the page loads
    const isOnboardingPage = pathname === '/founder/onboarding'
    if (isOnboardingPage) {
      setChecking(false)
      return () => { cancelled = true }
    }
    
    async function check() {
      try {
        const res = await fetch('/api/auth/check', {
          method: 'GET',
          headers: { 'Cache-Control': 'no-store' },
          credentials: 'include',
        })
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        
        const isAuthenticated = res.ok && data?.authenticated
        const isVerified = data?.verified === true
        const isDiscoverPage = pathname === '/founder/discover' || pathname?.startsWith('/founder/discover/')
        
        if (isDiscoverPage) {
          setChecking(false)
          return
        }
        
        if (!isAuthenticated) {
          const ret = encodeURIComponent(pathname || '/founder')
          router.push(`/signup?next=${ret}`)
          return
        }
        
        if (!isVerified) {
          const ret = encodeURIComponent(pathname || '/founder')
          router.push(`/signup/thank-you?next=${ret}`)
          return
        }
        
        setChecking(false)
      } catch (error) {
        if (cancelled) return
        const isDiscoverPage = pathname === '/founder/discover' || pathname?.startsWith('/founder/discover/')
        const isOnboardingPage = pathname === '/founder/onboarding'
        if (isDiscoverPage || isOnboardingPage) {
          setChecking(false)
          return
        }
        router.push('/signup/thank-you')
      }
    }
    check()
    return () => { cancelled = true }
  }, [router, pathname])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Checking membership...
      </div>
    )
  }

  return <>{children}</>
}


