'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CheckCircle, Loader2, ArrowLeft, Mail } from 'lucide-react'
import Link from 'next/link'
import { BRAND_NAME } from '@/lib/brand'
import { RESEND_DEV_CONSOLE_FALLBACK_HINT } from '@/lib/resend-user-messages'
import { CLIENT_STORAGE } from '@/lib/client-storage-keys'

const VERIFY_EMAIL_KEY = CLIENT_STORAGE.PENDING_VERIFY_EMAIL
const VERIFY_EMAIL_KEY_LEGACY = CLIENT_STORAGE.PENDING_VERIFY_EMAIL_LEGACY
const USER_EMAIL_KEY = CLIENT_STORAGE.USER_EMAIL
const USER_EMAIL_KEY_LEGACY = CLIENT_STORAGE.USER_EMAIL_LEGACY
const LOGGED_IN_KEY = CLIENT_STORAGE.LOGGED_IN
const LOGGED_IN_KEY_LEGACY = CLIENT_STORAGE.LOGGED_IN_LEGACY

export default function VerifyPage() {
  const searchParams = useSearchParams()
  const paramEmail = (searchParams.get('email') || '').trim()
  const authError = searchParams.get('error') || ''
  const redirectUrl = searchParams.get('redirect') || ''

  /** Email used for verify + resend (may be typed on this page if link had no ?email=). */
  const [email, setEmail] = useState('')

  useEffect(() => {
    if (paramEmail) {
      setEmail(paramEmail)
      try {
        sessionStorage.setItem(VERIFY_EMAIL_KEY, paramEmail)
      } catch {
        /* ignore */
      }
      return
    }
    try {
      const fromSession = sessionStorage.getItem(VERIFY_EMAIL_KEY)?.trim()
      if (fromSession) {
        setEmail(fromSession)
        return
      }
    } catch {
      /* ignore */
    }
    try {
      const fromLocal =
        localStorage.getItem(USER_EMAIL_KEY)?.trim() ||
        localStorage.getItem(USER_EMAIL_KEY_LEGACY)?.trim()
      if (fromLocal?.includes('@')) {
        setEmail(fromLocal)
      }
    } catch {
      /* ignore */
    }
  }, [paramEmail])

  /** Primary UI is 6 digits; 8 allowed if verify needs the full Supabase value. */
  const [otpInput, setOtpInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [devConsoleHint, setDevConsoleHint] = useState(false)
  const otpInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      setDevConsoleHint(sessionStorage.getItem(CLIENT_STORAGE.DEV_CONSOLE_MAGIC_LINK) === '1')
    } catch {
      setDevConsoleHint(false)
    }
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (paramEmail) {
        otpInputRef.current?.focus()
      }
    }, 0)
    return () => window.clearTimeout(t)
  }, [paramEmail])

  const handleVerify = async (verificationCode?: string) => {
    const raw = String(verificationCode ?? otpInput).trim()
    const digits = raw.replace(/\D/g, '')
    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setError('Enter the email address you used to sign up or log in.')
      return
    }

    if (digits.length !== 6 && digits.length !== 8) {
      setError('Enter the 6-digit code (or all 8 digits if the short code was rejected).')
      return
    }

    try {
      sessionStorage.setItem(VERIFY_EMAIL_KEY, normalizedEmail)
    } catch {
      /* ignore */
    }

    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important: Include cookies
        body: JSON.stringify({ email: normalizedEmail, code: raw }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Invalid verification code')
        setLoading(false)
        setOtpInput('')
        otpInputRef.current?.focus()
        return
      }

      setSuccess(true)

      try {
        sessionStorage.removeItem(CLIENT_STORAGE.DEV_CONSOLE_MAGIC_LINK)
      } catch {
        /* ignore */
      }
      setDevConsoleHint(false)

      if (data.user) {
        try {
          localStorage.setItem(USER_EMAIL_KEY, data.user.email || '')
          localStorage.setItem(LOGGED_IN_KEY, 'true')
          localStorage.removeItem(USER_EMAIL_KEY_LEGACY)
          localStorage.removeItem(LOGGED_IN_KEY_LEGACY)
        } catch {
          /* ignore */
        }
      }

      let targetUrl = redirectUrl

      if (!targetUrl) {
        if (data.user?.userType === 'investor') {
          targetUrl = '/vc/dashboard'
        } else if (data.user?.userType === 'mentor') {
          targetUrl = '/'
        } else {
          targetUrl = '/founder/onboarding'
        }
      }

      // Session cookies were set on this response; full navigation loads them reliably.
      setTimeout(() => {
        window.location.assign(targetUrl)
      }, 250)
    } catch (err) {
      setError('Failed to verify code. Please try again.')
      setLoading(false)
    }
  }

  const handleResend = async () => {
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setError('Enter your email above, then tap Resend Code.')
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
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email: normalizedEmail }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to resend code')
        setResending(false)
        return
      }

      // Show success message
      setError('')
      if (data.devConsoleFallback) {
        try {
          sessionStorage.setItem(CLIENT_STORAGE.DEV_CONSOLE_MAGIC_LINK, '1')
        } catch {
          /* ignore */
        }
        setDevConsoleHint(true)
        alert(RESEND_DEV_CONSOLE_FALLBACK_HINT)
      } else {
        alert('New verification code sent to your email!')
      }
      setOtpInput('')
      otpInputRef.current?.focus()
    } catch (err) {
      setError('Failed to resend code. Please try again.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          {success ? (
            <>
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-green-600">
                Email Verified!
              </CardTitle>
              <CardDescription>
                Redirecting you to your dashboard...
              </CardDescription>
            </>
          ) : (
            <>
              <div className="mx-auto w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
              <CardDescription>
                We sent a sign-in email to <strong>{email}</strong> with a <strong>verification code</strong> and/or a
                one-tap link. If you do not see a code, check spam, the <strong>dev server terminal</strong>, or use the
                link (it opens this site and signs you in).
                <br />
                <span className="text-sm text-muted-foreground mt-2 block">
                  You must verify your email to access {BRAND_NAME}
                </span>
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent>
          {!success ? (
            <>
              {devConsoleHint && (
                <div className="mb-4 p-3 text-sm text-amber-900 bg-amber-500/10 border border-amber-500/30 rounded-md">
                  {RESEND_DEV_CONSOLE_FALLBACK_HINT}
                </div>
              )}
              {(authError === 'callback' || authError === 'missing_code') && (
                <div className="mb-4 p-3 text-sm text-amber-900 bg-amber-500/10 border border-amber-500/30 rounded-md">
                  {authError === 'missing_code' ? (
                    <>
                      The sign-in link did not include a valid token (often wrong redirect URL in Supabase, or an
                      expired link). Enter your <strong>email</strong> below, then the <strong>code</strong> from the
                      email or terminal, or use <strong>Resend Code</strong>.
                    </>
                  ) : (
                    <>
                      The email link could not complete sign-in. Enter your <strong>email</strong> and the{' '}
                      <strong>code</strong> from that message or terminal, or tap <strong>Resend Code</strong>.
                    </>
                  )}
                </div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleVerify()
                }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label htmlFor="verify-email" className="text-sm font-medium block">
                    Email address
                  </label>
                  <Input
                    id="verify-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setError('')
                    }}
                    disabled={loading}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Same device as sign up? We try to pre-fill this. Otherwise type the email that received the code.
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="verify-otp" className="text-sm font-medium text-center block">
                    Verification code
                  </label>
                  <Input
                    ref={otpInputRef}
                    id="verify-otp"
                    name="otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="6-digit code"
                    maxLength={8}
                    value={otpInput}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 8)
                      setOtpInput(digits)
                      setError('')
                    }}
                    disabled={loading}
                    className="w-full h-14 text-center text-2xl font-bold tracking-[0.35em] font-mono"
                  />
                  <p className="text-xs text-center text-muted-foreground">
                    Use the <strong>6-digit</strong> code from email or terminal. If verify fails, try all{' '}
                    <strong>8 digits</strong> shown after &quot;If that code fails…&quot; in the terminal or email.
                  </p>
                </div>

                {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    loading ||
                    !email.trim().includes('@') ||
                    otpInput.replace(/\D/g, '').length < 6 ||
                    otpInput.replace(/\D/g, '').length === 7
                  }
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify Email'
                  )}
                </Button>

                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Didn't receive the code?
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleResend}
                    disabled={resending || !email.trim().includes('@')}
                    className="text-sm"
                  >
                    {resending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Resend Code'
                    )}
                  </Button>
                </div>

                <div className="pt-4 border-t">
                  <Link
                    href="/signup"
                    className="flex items-center justify-center text-sm text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Use a different email
                  </Link>
                </div>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


