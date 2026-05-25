'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, Mail } from 'lucide-react'
import Link from 'next/link'
import { BRAND_NAME } from '@/lib/brand'
import {
  AUTH_EMAIL_SPAM_DELIVERABILITY_HINT,
  AUTH_EMAIL_VERIFY_PAGE_SPAM_NOTE,
  RESEND_DEV_CONSOLE_FALLBACK_HINT,
} from '@/lib/resend-user-messages'
import { CLIENT_STORAGE } from '@/lib/client-storage-keys'
import { toast } from '@/components/ui/toast-simple'
import { useAuthSession } from '@/components/auth-session-provider'
import { sanitizeAuthNextPathForUserType } from '@/lib/auth-flow-paths'

const VERIFY_EMAIL_KEY = CLIENT_STORAGE.PENDING_VERIFY_EMAIL
const USER_EMAIL_KEY = CLIENT_STORAGE.USER_EMAIL

export default function VerifyPage() {
  const { loading: authLoading, authenticated, verified, user } = useAuthSession()
  const searchParams = useSearchParams()
  const paramEmail = (searchParams.get('email') || '').trim()
  const authError = searchParams.get('error') || ''
  const redirectUrl = searchParams.get('redirect')?.trim() || searchParams.get('next')?.trim() || ''

  const [email, setEmail] = useState('')
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [devConsoleHint, setDevConsoleHint] = useState(false)

  useEffect(() => {
    const fromSession = (() => {
      try {
        return sessionStorage.getItem(VERIFY_EMAIL_KEY)?.trim() || ''
      } catch {
        return ''
      }
    })()
    const fromLocal = (() => {
      try {
        return localStorage.getItem(USER_EMAIL_KEY)?.trim() || ''
      } catch {
        return ''
      }
    })()
    const resolved = paramEmail || fromSession || fromLocal
    if (resolved) setEmail(resolved)
  }, [paramEmail])

  useEffect(() => {
    if (authLoading || !authenticated) return
    const isVc = user?.userType === 'vc' || user?.userType === 'investor'
    const isMentor = user?.userType === 'mentor'
    const defaultVerified = isVc ? '/investor/dashboard' : isMentor ? '/mentor/dashboard' : '/founder/dashboard'
    const defaultUnverified = isVc ? '/investor/onboarding' : isMentor ? '/mentor/onboarding' : '/founder/onboarding'
    const fallback = verified ? defaultVerified : defaultUnverified
    const target = sanitizeAuthNextPathForUserType(
      redirectUrl ? redirectUrl : undefined,
      user?.userType,
      fallback
    )
    window.location.replace(target)
  }, [authLoading, authenticated, verified, redirectUrl, user?.userType])

  useEffect(() => {
    try {
      setDevConsoleHint(sessionStorage.getItem(CLIENT_STORAGE.DEV_CONSOLE_MAGIC_LINK) === '1')
    } catch {
      setDevConsoleHint(false)
    }
  }, [])

  const handleResend = async () => {
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setError('Open login and enter your email to resend a sign-in link.')
      return
    }
    try {
      sessionStorage.setItem(VERIFY_EMAIL_KEY, normalizedEmail)
    } catch {
      /* ignore */
    }
    setResending(true)
    setError('')
    try {
      const response = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: normalizedEmail,
          ...(redirectUrl ? { next: redirectUrl } : {}),
        }),
      })
      const ct = response.headers.get('content-type')
      if (!ct || !ct.includes('application/json')) {
        const text = await response.text()
        console.error('Resend non-JSON:', text.substring(0, 400))
        setError('Server error while resending. Please try again.')
        return
      }
      const data = await response.json()
      if (!response.ok) {
        const base = data.error || 'Failed to resend sign-in link'
        const detail =
          typeof data.details === 'string' && data.details.trim() ? data.details.trim() : ''
        setError(detail ? `${base} ${detail}` : base)
        return
      }
      if (data.devConsoleFallback) {
        try {
          sessionStorage.setItem(CLIENT_STORAGE.DEV_CONSOLE_MAGIC_LINK, '1')
        } catch {
          /* ignore */
        }
        setDevConsoleHint(true)
        toast.info(RESEND_DEV_CONSOLE_FALLBACK_HINT, 12000)
      } else {
        toast.success(`A new link has been sent. ${AUTH_EMAIL_SPAM_DELIVERABILITY_HINT}`)
      }
    } catch {
      setError('Failed to resend sign-in link. Please try again.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-950 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
          <CardDescription>
            We sent a one-tap sign-in link to <strong>{email || 'your email'}</strong>. Click it to open {BRAND_NAME}{' '}
            already signed in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground leading-relaxed">
            {AUTH_EMAIL_VERIFY_PAGE_SPAM_NOTE}
          </div>
          {devConsoleHint && (
            <div className="p-3 text-sm text-amber-900 bg-amber-500/10 border border-amber-500/30 rounded-md">
              {RESEND_DEV_CONSOLE_FALLBACK_HINT}
            </div>
          )}
          {(authError === 'callback' || authError === 'missing_code') && (
            <div className="p-3 text-sm text-amber-900 bg-amber-500/10 border border-amber-500/30 rounded-md">
              The sign-in link expired or failed. Tap resend to receive a fresh one.
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              {error}
            </div>
          )}
          <Button type="button" variant="default" className="w-full" onClick={handleResend} disabled={resending}>
            {resending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Resend Sign-In Link'
            )}
          </Button>
          <div className="pt-2 border-t">
            <Link
              href={redirectUrl ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : '/login'}
              className="flex items-center justify-center text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


