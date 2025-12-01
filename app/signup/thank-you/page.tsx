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
        const res = await fetch('/api/auth/check', {
          credentials: 'include',
          headers: { 'Cache-Control': 'no-cache' }
        })
        const data = await res.json().catch(() => ({}))
        
        // If user is authenticated and verified, redirect to dashboard or home
        if (data?.authenticated && data?.verified) {
          const nextUrl = searchParams.get('next') || '/founder/discover'
          router.replace(nextUrl)
          return
        }
        
        // If not authenticated at all, redirect to signup
        if (!data?.authenticated) {
          router.replace('/signup')
          return
        }
      } catch (error) {
        // On error, redirect to signup
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


