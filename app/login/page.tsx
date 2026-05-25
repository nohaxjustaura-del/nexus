'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Mail, Loader2, ArrowLeft, Clock, X, UserRound } from 'lucide-react'
import { CLIENT_STORAGE } from '@/lib/client-storage-keys'
import { useAuthSession } from '@/components/auth-session-provider'
import { AUTH_EMAIL_SPAM_DELIVERABILITY_LINE } from '@/lib/resend-user-messages'
import { sanitizeAuthNextPathForUserType } from '@/lib/auth-flow-paths'

type ApprovalModalVariant = 'pending' | 'rejected'

export default function LoginPage() {
  const router = useRouter()
  const { loading: authLoading, authenticated, verified, user } = useAuthSession()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect') || searchParams.get('next') || ''
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [accountExistsModalOpen, setAccountExistsModalOpen] = useState(false)
  const [approvalModal, setApprovalModal] = useState<{ open: boolean; variant: ApprovalModalVariant }>({
    open: false,
    variant: 'pending',
  })

  useEffect(() => {
    if (searchParams.get('accountExists') !== '1') return
    const prefill = searchParams.get('email')?.trim()
    if (prefill?.includes('@')) setEmail(prefill)
    setAccountExistsModalOpen(true)
    const next = new URLSearchParams()
    if (redirectUrl) next.set('redirect', redirectUrl)
    const qs = next.toString()
    router.replace(qs ? `/login?${qs}` : '/login')
  }, [searchParams, router, redirectUrl])

  useEffect(() => {
    if (searchParams.get('pendingApproval') !== '1') return
    const rejected = searchParams.get('rejected') === '1'
    setApprovalModal({ open: true, variant: rejected ? 'rejected' : 'pending' })
    const next = new URLSearchParams()
    if (redirectUrl) next.set('redirect', redirectUrl)
    router.replace(next.toString() ? `/login?${next}` : '/login')
  }, [searchParams, router, redirectUrl])

  useEffect(() => {
    if (authLoading || !authenticated) return
    const t = (user?.userType || '').toLowerCase()
    const defaultVerified =
      t === 'vc' || t === 'investor'
        ? '/investor/dashboard'
        : t === 'mentor'
          ? '/mentor/dashboard'
          : '/founder/dashboard'
    const defaultUnverified =
      t === 'vc' || t === 'investor'
        ? '/investor/onboarding'
        : t === 'mentor'
          ? '/mentor/onboarding'
          : '/founder/onboarding'
    const fallback = verified ? defaultVerified : defaultUnverified
    const target = sanitizeAuthNextPathForUserType(
      redirectUrl ? redirectUrl : undefined,
      user?.userType,
      fallback
    )
    window.location.replace(target)
  }, [authLoading, authenticated, verified, redirectUrl, user?.userType])

  useEffect(() => {
    if (!approvalModal.open && !accountExistsModalOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [approvalModal.open, accountExistsModalOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    // Validate email before submitting
    const trimmedEmail = email.trim()
    const isTestSuperLogin = trimmedEmail.toLowerCase() === 'test12345'
    if (!trimmedEmail || (!trimmedEmail.includes('@') && !isTestSuperLogin)) {
      setError('Please enter a valid email address')
      return
    }
    
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email: trimmedEmail }),
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
        if (
          data.code === 'ACCOUNT_PENDING_APPROVAL' ||
          data.code === 'ACCOUNT_REJECTED'
        ) {
          setError('')
          setApprovalModal({
            open: true,
            variant: data.code === 'ACCOUNT_REJECTED' ? 'rejected' : 'pending',
          })
          return
        }
        const base = data.error || data.message || 'Something went wrong'
        const detail =
          typeof data.details === 'string' && data.details.trim() ? data.details.trim() : ''
        setError(detail ? `${base} ${detail}` : base)
        return
      }

      // Admin bypass: already fully authenticated server-side
      if (data.adminBypass) {
        if (data.user) {
          try {
            localStorage.setItem(CLIENT_STORAGE.USER_EMAIL, data.user.email || '')
            localStorage.setItem(CLIENT_STORAGE.LOGGED_IN, 'true')
          } catch { /* ignore */ }
        }

        let targetUrl = redirectUrl
        if (!targetUrl) {
          const t = data.user?.userType
          if (t === 'investor' || t === 'vc') targetUrl = '/investor/dashboard'
          else if (t === 'mentor') targetUrl = '/mentor/dashboard'
          else targetUrl = '/founder/dashboard'
        }

        window.location.assign(targetUrl)
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

      const verifyUrl = `/verify?email=${encodeURIComponent(resolvedEmail)}${redirectUrl ? `&redirect=${encodeURIComponent(redirectUrl)}` : ''}`
      router.push(verifyUrl)
    } catch (err: any) {
      console.error('Login error:', err)
      if (err.message?.includes('JSON')) {
        setError('Server error: Please check your connection and try again.')
      } else {
        setError(err.message || 'Failed to send sign-in link. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const closeApprovalModal = () => setApprovalModal((m) => ({ ...m, open: false }))
  const closeAccountExistsModal = () => setAccountExistsModalOpen(false)
  const isTestSuperLoginInput = email.trim().toLowerCase() === 'test12345'

  return (
    <div className="relative flex min-h-[calc(100vh-3.25rem)] items-center justify-center p-5 sm:p-8">
      {accountExistsModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="account-exists-modal-title"
          onClick={closeAccountExistsModal}
        >
          <Card
            className="relative w-full max-w-md border-border/50 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeAccountExistsModal}
              className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            <CardHeader className="space-y-2 text-center pb-2 pt-8">
              <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center bg-primary/12 ring-1 ring-border/60">
                <UserRound className="w-6 h-6 text-primary" />
              </div>
              <CardTitle id="account-exists-modal-title" className="font-heading text-xl font-semibold tracking-tight">
                You already have an account
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground leading-relaxed px-1">
                An account with this email is already registered. Use “Send Sign-In Link” below to log in.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2 pb-6">
              <Button type="button" className="w-full rounded-full" onClick={closeAccountExistsModal}>
                OK
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
      {approvalModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="approval-modal-title"
          onClick={closeApprovalModal}
        >
          <Card
            className="relative w-full max-w-md border-border/50 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeApprovalModal}
              className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            <CardHeader className="space-y-2 text-center pb-2 pt-8">
              <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center bg-primary/12 ring-1 ring-border/60">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <CardTitle id="approval-modal-title" className="font-heading text-xl font-semibold tracking-tight">
                {approvalModal.variant === 'rejected'
                  ? 'Application not approved'
                  : 'Account under review'}
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground leading-relaxed px-1">
                {approvalModal.variant === 'rejected' ? (
                  <>
                    Your application was not approved at this time. If you have questions, you can reply to the email
                    we sent you.
                  </>
                ) : (
                  <>
                    Thanks for your patience. Our team is still working on verifying your account. We’ll email you as
                    soon as everything is ready. You don’t need to do anything else right now.
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2 pb-6">
              <Button type="button" className="w-full rounded-full" onClick={closeApprovalModal}>
                OK
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
      <Card className="w-full max-w-md border-border/60 bg-card/95 shadow-sm">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-primary/15 ring-1 ring-border/60">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="font-heading text-2xl font-bold tracking-tight">Log in</CardTitle>
          <CardDescription>
            Enter your email to receive a one-tap sign-in link.
          </CardDescription>
          <p className="text-center text-xs text-muted-foreground leading-relaxed px-1">
            {AUTH_EMAIL_SPAM_DELIVERABILITY_LINE}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email or test login
              </label>
              <Input
                id="email"
                type="text"
                inputMode="email"
                placeholder="you@example.com or test12345"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError('')
                }}
                required
                disabled={loading}
                className="w-full"
                autoComplete="email"
              />
            </div>

            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/25 rounded-md">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading || !email.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isTestSuperLoginInput ? 'Signing in...' : 'Sending link...'}
                </>
              ) : (
                <>
                  {isTestSuperLoginInput ? 'Sign in' : 'Send Sign-In Link'}
                  <Mail className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <div className="pt-4 border-t">
              <p className="text-sm text-center text-muted-foreground mb-2">
                Don't have an account?{' '}
                <Link href={`/signup${redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`} className="text-primary hover:underline">
                  Sign up
                </Link>
              </p>
              <Link
                href="/"
                className="flex items-center justify-center text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to home
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}














