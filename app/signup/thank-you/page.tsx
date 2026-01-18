'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function SignupThankYouPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check if user is authenticated and verified - if so, redirect them away
    async function checkAuth() {
      try {
        console.log('[THANK-YOU] Checking auth status...')
        const res = await fetch('/api/auth/check', {
          credentials: 'include',
          headers: { 'Cache-Control': 'no-cache' }
        })
        const data = await res.json().catch(() => ({}))
        
        console.log('[THANK-YOU] Auth check result:', { authenticated: data?.authenticated, verified: data?.verified, userType: data?.user?.userType })
        
        // If user is authenticated and verified, check if they have a founder profile
        if (data?.authenticated && data?.verified) {
          // For founders, check if profile exists - if not, redirect to onboarding
          if (data?.user?.userType === 'founder') {
            try {
              const profileRes = await fetch('/api/founder/profile', { credentials: 'include' })
              if (profileRes.ok) {
                const profileData = await profileRes.json()
                console.log('[THANK-YOU] Profile check result:', { exists: profileData.exists })
                if (!profileData.exists) {
                  // No profile - redirect to onboarding (required during signup)
                  console.log('[THANK-YOU] No profile found, redirecting to onboarding')
                  router.replace('/founder/onboarding')
                  return
                }
              } else {
                // Profile check failed - redirect to onboarding to be safe
                console.log('[THANK-YOU] Profile check failed, redirecting to onboarding')
                router.replace('/founder/onboarding')
                return
              }
            } catch (e) {
              // Error checking profile - redirect to onboarding
              console.log('[THANK-YOU] Error checking profile, redirecting to onboarding:', e)
              router.replace('/founder/onboarding')
              return
            }
          }
          
          // Profile exists - DO NOT redirect automatically
          // User should be able to navigate themselves
          // Only redirect if they explicitly have a next URL parameter
          const nextUrl = searchParams.get('next')
          console.log('[THANK-YOU] Next URL:', nextUrl)
          if (nextUrl && nextUrl.includes('onboarding')) {
            // User explicitly wants onboarding - allow it
            console.log('[THANK-YOU] Redirecting to onboarding as requested:', nextUrl)
            router.replace(nextUrl)
            return
          }
          // DO NOT auto-redirect to discover - let user stay or navigate themselves
          console.log('[THANK-YOU] Profile exists, staying on thank-you page - no auto-redirect')
          // router.replace('/founder/discover')
          // return
        }
        
        // If not authenticated at all, redirect to signup
        if (!data?.authenticated) {
          console.log('[THANK-YOU] Not authenticated, redirecting to signup')
          router.replace('/signup')
          return
        }
      } catch (error) {
        // On error, redirect to signup
        console.error('[THANK-YOU] Error in checkAuth:', error)
        router.replace('/signup')
      }
    }

    checkAuth()
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-2xl px-4 py-20">
        <div className="rounded-lg border bg-card p-10 text-center shadow-sm">
          <h1 className="mb-3 text-3xl font-bold">Thanks — your signup is under review</h1>
          <p className="text-muted-foreground">
            We received your information and ID. Our team will verify your account and email you with the result.
            This typically takes less than 24 hours.
          </p>
          <div className="mt-8 space-x-3">
            <a href="/" className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-primary-foreground">
              Go to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}


