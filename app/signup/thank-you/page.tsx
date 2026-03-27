'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthSession } from '@/components/auth-session-provider'

export const dynamic = 'force-dynamic'

export default function SignupThankYouPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { loading: authLoading, authenticated, verified, user } = useAuthSession()

  useEffect(() => {
    if (authLoading) return

    async function run() {
      if (authenticated && verified) {
        if (user?.userType === 'founder') {
          try {
            const profileRes = await fetch('/api/founder/profile', { credentials: 'include' })
            if (profileRes.ok) {
              const profileData = await profileRes.json()
              if (!profileData.exists) {
                router.replace('/founder/onboarding')
                return
              }
            } else {
              router.replace('/founder/onboarding')
              return
            }
          } catch {
            router.replace('/founder/onboarding')
            return
          }
        }

        const nextUrl = searchParams.get('next')
        if (nextUrl && nextUrl.includes('onboarding')) {
          router.replace(nextUrl)
        }
        return
      }

      if (!authenticated) {
        router.replace('/signup')
      }
    }

    void run()
  }, [authLoading, authenticated, verified, user, router, searchParams])

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-2xl px-4 py-20">
        <div className="rounded-lg border bg-card p-10 text-center shadow-sm">
          <h1 className="mb-3 font-heading text-3xl font-bold tracking-tight">Thanks. Your signup is under review.</h1>
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
