'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Mail, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CLIENT_STORAGE } from '@/lib/client-storage-keys'
import { useAuthSession } from '@/components/auth-session-provider'
import { sanitizeAuthNextPathForUserType, signupCallbackPath } from '@/lib/auth-flow-paths'
import { BRAND_NAME } from '@/lib/brand'
import { AUTH_EMAIL_SPAM_DELIVERABILITY_LINE } from '@/lib/resend-user-messages'

export function SignUpForm() {
  const router = useRouter()
  const { loading: authLoading, authenticated, verified, user } = useAuthSession()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect') || searchParams.get('next') || ''
  const [email, setEmail] = useState('')
  const [userType, setUserType] = useState<'founder' | 'investor' | 'mentor'>('founder')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  /** Once the user picks a role, do not overwrite from URL (next/redirect can arrive after hydration). */
  const userPickedAccountTypeRef = useRef(false)

  const selectAccountType = (t: 'founder' | 'investor' | 'mentor') => {
    userPickedAccountTypeRef.current = true
    setUserType(t)
  }

  useEffect(() => {
    if (userPickedAccountTypeRef.current) return
    const r = redirectUrl.trim()
    if (r === '/vc/claim' || r.startsWith('/vc/')) {
      setUserType('investor')
    } else if (r.startsWith('/founder/') || r === '/pricing') {
      setUserType('founder')
    }
  }, [redirectUrl])

  useEffect(() => {
    if (authLoading || !authenticated) return
    const isVc = user?.userType === 'vc' || user?.userType === 'investor'
    const fallback = isVc
      ? verified
        ? '/vc/dashboard'
        : '/vc/claim'
      : verified
        ? '/founder/dashboard'
        : '/founder/onboarding'
    const target = sanitizeAuthNextPathForUserType(
      redirectUrl ? redirectUrl : undefined,
      user?.userType,
      fallback
    )
    window.location.replace(target)
  }, [authLoading, authenticated, verified, redirectUrl, user?.userType])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmedEmail = email.trim()
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email: trimmedEmail, userType }),
      })

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response:', text.substring(0, 500))
        setError('Server error. Please check console for details.')
        return
      }

      const data = await response.json()

      if (!response.ok) {
        if (data.existingAccount) {
          const params = new URLSearchParams()
          if (redirectUrl) params.set('redirect', redirectUrl)
          params.set('accountExists', '1')
          params.set('email', trimmedEmail)
          router.replace(`/login?${params.toString()}`)
          return
        }
        const base = data.error || data.message || 'Something went wrong'
        const detail =
          typeof data.details === 'string' && data.details.trim() ? data.details.trim() : ''
        setError(detail ? `${base} ${detail}` : base)
        return
      }

      const resolvedEmail = (data.email || trimmedEmail).toLowerCase().trim()
      try {
        sessionStorage.setItem(CLIENT_STORAGE.PENDING_VERIFY_EMAIL, resolvedEmail)
        if (data.devConsoleFallback) {
          sessionStorage.setItem(CLIENT_STORAGE.DEV_CONSOLE_MAGIC_LINK, '1')
        }
      } catch {
        /* ignore */
      }

      const afterVerify = redirectUrl || signupCallbackPath(userType)
      const verifyUrl = `/verify?email=${encodeURIComponent(resolvedEmail)}&redirect=${encodeURIComponent(afterVerify)}`
      router.push(verifyUrl)
    } catch (err: any) {
      console.error('Signup error:', err)
      if (err.message?.includes('JSON')) {
        setError('Server error: Please check your connection and try again.')
      } else {
        setError(err.message || 'Failed to send sign-in link. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const roleTabClass = (active: boolean) =>
    cn(
      'flex-1 rounded-full px-3 py-2 text-sm font-medium transition-colors',
      active
        ? 'bg-primary text-primary-foreground shadow-sm'
        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
    )

  return (
    <div className="min-h-screen bg-background">
      <div className="container relative z-[1] mx-auto max-w-md px-4 py-8 md:py-12">
        <header className="mb-8 text-center">
          <Badge className="mb-3 px-2.5 py-0.5 text-xs font-medium" variant="secondary">
            <Mail className="mr-1.5 h-3.5 w-3.5" />
            Sign up
          </Badge>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Create your account
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Pick how you&apos;ll use {BRAND_NAME}, then enter your email. We&apos;ll send a one-tap verification link.
          </p>
          <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground leading-relaxed">
            {AUTH_EMAIL_SPAM_DELIVERABILITY_LINE}
          </p>
        </header>

        <Card className="relative z-[1]">
          <CardContent className="space-y-6 p-6 md:p-7">
            <form noValidate onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError('')
                  }}
                  disabled={loading}
                  className="w-full"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <p id="account-type-label" className="text-sm font-medium leading-none text-foreground">
                  Create account as
                </p>
                <div
                  role="group"
                  aria-labelledby="account-type-label"
                  className="flex gap-1 rounded-full border border-border/60 bg-muted/20 p-1"
                >
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => selectAccountType('founder')}
                    className={roleTabClass(userType === 'founder')}
                  >
                    Founder
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => selectAccountType('investor')}
                    className={roleTabClass(userType === 'investor')}
                  >
                    Investor / VC
                  </button>
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => selectAccountType('mentor')}
                    className={cn(
                      'font-medium underline-offset-4 hover:underline',
                      userType === 'mentor' ? 'text-primary' : 'text-muted-foreground'
                    )}
                  >
                    I&apos;m a mentor
                  </button>
                </p>
              </div>

              {error && (
                <div className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Sending link…
                  </>
                ) : (
                  <>
                    Send verification link
                    <Mail className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                By signing up, you agree to our Terms of Service and Privacy Policy
              </p>

              <div className="border-t border-border/50 pt-6">
                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <Link
                    href={`/login${redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`}
                    className="font-medium text-primary hover:underline"
                  >
                    Log in
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
