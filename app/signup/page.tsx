'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Mail, Loader2 } from 'lucide-react'
import { CLIENT_STORAGE } from '@/lib/client-storage-keys'

export default function SignUpPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect') || searchParams.get('next') || ''
  const [email, setEmail] = useState('')
  const [userType, setUserType] = useState<'founder' | 'investor' | 'mentor'>('founder')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/auth/check', {
          credentials: 'include',
          headers: { 'Cache-Control': 'no-cache' },
        })
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (data?.authenticated) {
          const target = redirectUrl || (data?.verified ? '/founder/dashboard' : '/founder/onboarding')
          window.location.replace(target)
        }
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [redirectUrl])

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
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email: trimmedEmail, userType }),
      })

      // Check if response is JSON
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
        if (data.existingAccount) {
          const params = new URLSearchParams()
          if (redirectUrl) params.set('redirect', redirectUrl)
          params.set('accountExists', '1')
          params.set('email', trimmedEmail)
          setLoading(false)
          router.replace(`/login?${params.toString()}`)
          return
        }
        setError(data.error || data.message || 'Something went wrong')
        setLoading(false)
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

      // Redirect to verification page with email and return URL
      const verifyUrl = `/verify?email=${encodeURIComponent(resolvedEmail)}${redirectUrl ? `&redirect=${encodeURIComponent(redirectUrl)}` : ''}`
      router.push(verifyUrl)
    } catch (err: any) {
      console.error('Signup error:', err)
      // More helpful error message
      if (err.message?.includes('JSON')) {
        setError('Server error: Please check your connection and try again.')
      } else {
        setError(err.message || 'Failed to send verification code. Please try again.')
      }
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-background p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-3xl -z-10" />
      
      <Card className="w-full max-w-md border-2 border-border shadow-2xl bg-card/95 backdrop-blur-sm">
        <CardHeader className="space-y-1 text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary via-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">Create Your Account</CardTitle>
          <CardDescription className="text-base mt-2">
            Enter your email to get started. We'll send you a one-tap verification link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-semibold text-foreground/85">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError('') // Clear error when typing
                }}
                onKeyDown={(e) => {
                  // Allow Enter key to submit
                  if (e.key === 'Enter' && email.trim() && !loading) {
                    handleSubmit(e as any)
                  }
                }}
                required
                disabled={loading}
                className="w-full h-12 border-2 border-border focus:border-primary rounded-xl text-base transition-all"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="userType" className="text-sm font-semibold text-foreground/85">
                I am a...
              </label>
              <select
                id="userType"
                value={userType}
                onChange={(e) => setUserType(e.target.value as 'founder' | 'investor' | 'mentor')}
                disabled={loading}
                className="flex h-12 w-full rounded-xl border-2 border-border focus:border-primary bg-background px-4 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
              >
                <option value="founder">Founder</option>
                <option value="investor">Investor/VC</option>
                <option value="mentor">Mentor</option>
              </select>
            </div>

            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-primary via-blue-600 to-purple-600 hover:from-primary/90 hover:via-blue-600/90 hover:to-purple-600/90 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold text-base"
              disabled={loading}
              onClick={(e) => {
                // Allow click even if email is empty - validation happens in handleSubmit
                if (!email.trim()) {
                  e.preventDefault()
                  setError('Please enter your email address')
                  return
                }
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Sending link...
                </>
              ) : (
                <>
                  Send Verification Link
                  <Mail className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              By signing up, you agree to our Terms of Service and Privacy Policy
            </p>

            <div className="pt-4 border-t">
              <p className="text-sm text-center text-muted-foreground">
                Already have an account?{' '}
                <Link href={`/login${redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`} className="text-primary hover:underline">
                  Log in
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

