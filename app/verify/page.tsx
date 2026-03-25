'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CheckCircle, Loader2, ArrowLeft, Mail } from 'lucide-react'
import Link from 'next/link'
import { useOtpCooldown } from '@/lib/use-otp-cooldown'
import { BRAND_NAME } from '@/lib/brand'
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

  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const { secondsLeft: resendCooldownLeft, start: startResendCooldown, active: resendCooldownActive } =
    useOtpCooldown()

  useEffect(() => {
    // Prefer code boxes when email already known (e.g. from ?email=); otherwise user starts at email field.
    const t = window.setTimeout(() => {
      if (paramEmail) {
        inputRefs.current[0]?.focus()
      }
    }, 0)
    return () => window.clearTimeout(t)
  }, [paramEmail])

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const pastedCode = value.slice(0, 6).split('')
      const newCode = [...code]
      pastedCode.forEach((char, i) => {
        if (index + i < 6 && /^\d$/.test(char)) {
          newCode[index + i] = char
        }
      })
      setCode(newCode)
      // Focus the last filled input or submit
      const nextIndex = Math.min(index + pastedCode.length, 5)
      inputRefs.current[nextIndex]?.focus()
      return
    }

    if (!/^\d$/.test(value) && value !== '') return

    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all 6 digits are entered
    if (index === 5 && value && newCode.every(digit => digit !== '')) {
      handleVerify(newCode.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  // Allow copy-paste of the full 6-digit code from the email
  const handlePaste = (index: number) => (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text') || ''
    const digits = pasted.replace(/\D/g, '').slice(0, 6)
    if (digits.length > 1) {
      e.preventDefault()
      const newCode = [...code]
      for (let i = 0; i < digits.length && index + i < 6; i++) {
        newCode[index + i] = digits[i]
      }
      setCode(newCode)
      const nextIndex = Math.min(index + digits.length, 5)
      if (newCode.every(d => d !== '')) {
        handleVerify(newCode.join(''))
      } else {
        inputRefs.current[nextIndex]?.focus()
      }
    }
  }

  const handleVerify = async (verificationCode?: string) => {
    const codeToVerify = verificationCode || code.join('')
    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setError('Enter the email address you used to sign up or log in.')
      return
    }

    if (codeToVerify.length !== 6) {
      setError('Please enter the complete 6-digit code')
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
        body: JSON.stringify({ email: normalizedEmail, code: codeToVerify }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Invalid verification code')
        setLoading(false)
        // Clear code on error
        setCode(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
        return
      }

      setSuccess(true)

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
        const retrySec =
          typeof data.retryAfterSeconds === 'number'
            ? data.retryAfterSeconds
            : response.status === 429
              ? 60
              : 0
        if (retrySec > 0) startResendCooldown(retrySec)
        setResending(false)
        return
      }

      // Show success message
      setError('')
      alert('New verification code sent to your email!')
      setCode(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } catch (err) {
      setError('Failed to resend code. Please try again.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
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
                We sent a sign-in email to <strong>{email}</strong> with a <strong>6-digit code</strong> and/or a
                one-tap link. If you do not see a code, check spam or use the link in the email (it opens this site and
                signs you in).
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
              {(authError === 'callback' || authError === 'missing_code') && (
                <div className="mb-4 p-3 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-md">
                  {authError === 'missing_code' ? (
                    <>
                      The sign-in link did not include a valid token (often wrong redirect URL in Supabase, or an
                      expired link). Enter your <strong>email</strong> below, then the <strong>6-digit code</strong> from
                      the email, or use <strong>Resend Code</strong>.
                    </>
                  ) : (
                    <>
                      The email link could not complete sign-in. Enter your <strong>email</strong> and the{' '}
                      <strong>6-digit code</strong> from that message, or tap <strong>Resend Code</strong>.
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
                  <label className="text-sm font-medium text-center block">
                    Enter Verification Code
                  </label>
                  <div className="flex gap-2 justify-center">
                    {code.map((digit, index) => (
                      <Input
                        key={index}
                        id={`code-input-${index}`}
                        name={`code-${index}`}
                        ref={(el) => {
                          inputRefs.current[index] = el
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleCodeChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        onPaste={handlePaste(index)}
                        disabled={loading}
                        className="w-12 h-14 text-center text-2xl font-bold tracking-widest"
                        autoComplete="off"
                      />
                    ))}
                  </div>
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
                    code.some(d => d === '')
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
                    disabled={resending || resendCooldownActive || !email.trim().includes('@')}
                    className="text-sm"
                  >
                    {resending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : resendCooldownActive ? (
                      `Wait ${resendCooldownLeft}s to resend`
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


