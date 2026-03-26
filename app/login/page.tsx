'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Mail, Loader2, ArrowLeft } from 'lucide-react'
import { CLIENT_STORAGE } from '@/lib/client-storage-keys'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect') || searchParams.get('next') || ''
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [existingAccountBanner, setExistingAccountBanner] = useState(false)

  useEffect(() => {
    if (searchParams.get('accountExists') !== '1') return
    setExistingAccountBanner(true)
    const prefill = searchParams.get('email')?.trim()
    if (prefill?.includes('@')) setEmail(prefill)
    const next = new URLSearchParams()
    if (redirectUrl) next.set('redirect', redirectUrl)
    const qs = next.toString()
    router.replace(qs ? `/login?${qs}` : '/login')
  }, [searchParams, router, redirectUrl])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    // Validate email before submitting
    const trimmedEmail = email.trim()
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
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
        setLoading(false)
        return
      }

      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.error || data.message || 'Something went wrong'
        setError(errorMsg)
        setLoading(false)
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
          if (data.user?.userType === 'investor') targetUrl = '/vc/dashboard'
          else if (data.user?.userType === 'mentor') targetUrl = '/'
          else targetUrl = '/founder/onboarding'
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
        setError(err.message || 'Failed to send verification code. Please try again.')
      }
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-3.25rem)] items-center justify-center p-5 sm:p-8">
      <Card className="w-full max-w-md border-border/35 shadow-none">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-primary/15 ring-1 ring-border/60">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="font-heading text-2xl font-bold tracking-tight">Log in</CardTitle>
          <CardDescription>
            Enter your email to receive a verification code
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {existingAccountBanner && (
              <div className="p-3 text-sm text-amber-950 bg-amber-500/15 border border-amber-500/30 rounded-md">
                An account with this email already exists. Log in below to get a sign-in link or code.
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
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

            <Button
              type="submit"
              className="w-full rounded-full"
              disabled={loading || !email.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Code...
                </>
              ) : (
                <>
                  Send Verification Code
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














