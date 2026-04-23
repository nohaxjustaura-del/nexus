'use client'

import { useEffect } from 'react'
import Link from 'next/link'
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
        const isVc = user?.userType === 'vc' || user?.userType === 'investor'

        if (isVc) {
          try {
            const profileRes = await fetch('/api/investor/profile', { credentials: 'include' })
            if (profileRes.ok) {
              const profileData = await profileRes.json()
              if (!profileData.onboardingCompleted) {
                router.replace('/investor/onboarding')
                return
              }
            } else {
              router.replace('/investor/onboarding')
              return
            }
          } catch {
            router.replace('/investor/onboarding')
            return
          }
        } else if (user?.userType === 'founder') {
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
        } else if (user?.userType === 'mentor') {
          router.replace('/mentor/onboarding')
          return
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

  if (!authLoading && authenticated && !verified) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-2xl px-4 py-20">
          <div className="rounded-2xl border border-border/60 bg-card/95 p-10 text-center shadow-sm">
            <h1 className="mb-3 font-heading text-3xl font-bold tracking-tight">Check your email</h1>
            <p className="text-muted-foreground">
              We sent you a verification link. Open it on this device to confirm your email and open your account.
            </p>
            <div className="mt-8 space-x-3">
              <a href="/login" className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-primary-foreground">
                Back to sign in
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-2xl px-4 py-20">
        <div className="rounded-2xl border border-border/60 bg-card/95 p-10 text-center shadow-sm">
          <h1 className="mb-3 font-heading text-3xl font-bold tracking-tight">Almost there</h1>
          <p className="text-muted-foreground">
            Follow the link in your email to verify your address. After that, you can use the product right away.
          </p>
          <div className="mt-8 space-x-3">
            <Link href="/" className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-primary-foreground">
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
