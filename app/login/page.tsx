'use client'

import { useState } from 'react'
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
  const redirectUrl = searchParams.get('redirect') || ''
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
          else targetUrl = '/founder/ai-analysis'
        }

        window.location.assign(targetUrl)
        return
      }

      // Success! Show appropriate message
      if (data.code) {
        // Dev mode - show code in alert
        alert(`🔐 Verification Code (Dev Mode)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nYour code is: ${data.code}\n\nThis code will expire in 10 minutes.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      } else {
        // Production - email was sent
        alert(`✅ Verification code sent!\n\nCheck your email inbox for the code.\n\n(If you don't see it, check your spam folder.)`)
      }

      const resolvedEmail = (data.email || trimmedEmail).toLowerCase().trim()
      try {
        sessionStorage.setItem(CLIENT_STORAGE.PENDING_VERIFY_EMAIL, resolvedEmail)
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Log In</CardTitle>
          <CardDescription>
            Enter your email to receive a verification code
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
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














