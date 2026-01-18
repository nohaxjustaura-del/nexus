'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CheckCircle, Loader2, ArrowLeft, Mail } from 'lucide-react'
import Link from 'next/link'

export default function VerifyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const redirectUrl = searchParams.get('redirect') || ''
  
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus()
  }, [])

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
    
    if (codeToVerify.length !== 6) {
      setError('Please enter the complete 6-digit code')
      return
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
        body: JSON.stringify({ email, code: codeToVerify }),
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
      
      // Store session info in localStorage as backup
      if (data.user) {
        try {
          localStorage.setItem('fm_user_email', data.user.email || '')
          localStorage.setItem('fm_logged_in', 'true')
        } catch (e) {
          // localStorage might not be available, that's okay
        }
      }
      
      // Check if founder profile exists before redirecting
      let targetUrl = redirectUrl
      
      if (!targetUrl) {
        if (data.user?.userType === 'investor') {
          targetUrl = '/vc/dashboard'
        } else if (data.user?.userType === 'mentor') {
          targetUrl = '/'
        } else {
          // For founders, ALWAYS redirect to onboarding first (required during signup)
          // They must complete onboarding before accessing other features
          targetUrl = '/founder/onboarding'
        }
      }
      
      // Wait a moment for cookie to be set, then verify it's working
      setTimeout(async () => {
        let retries = 0
        const maxRetries = 10 // Increased retries
        
        const checkAndRedirect = async () => {
          try {
            // First check debug endpoint to see cookie status
            const debugResponse = await fetch('/api/auth/debug', {
              method: 'GET',
              credentials: 'include',
            })
            
            const debugData = await debugResponse.json()
            
            // Then check auth status
            const checkResponse = await fetch('/api/auth/check', {
              method: 'GET',
              credentials: 'include',
            })
            
            if (!checkResponse.ok) {
              throw new Error('Auth check failed')
            }
            
            const checkData = await checkResponse.json()
            
            // If cookie exists and user is authenticated and verified, redirect
            if (debugData.hasCookie && checkData.authenticated && checkData.verified) {
              // Cookie is set and verified - safe to redirect
              console.log('✅ Cookie verified, redirecting to:', targetUrl)
              // Use window.location for full page reload to ensure cookie is read
              window.location.href = targetUrl
              return
            }
            
            // If we have a cookie but verification check failed, try fixing session
            if (debugData.hasCookie && (!checkData.verified || !checkData.authenticated)) {
              console.log('🔧 Cookie exists but not verified, attempting auto-fix...')
              try {
                const fixResponse = await fetch('/api/auth/fix-session', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: data.user?.email || email }),
                  credentials: 'include',
                })
                const fixData = await fixResponse.json()
                if (fixData.success) {
                  console.log('✅ Session fixed, redirecting...')
                  window.location.href = targetUrl
                  return
                }
              } catch (fixError) {
                console.error('Fix failed:', fixError)
              }
            }
            
            // Retry if not ready yet
            if (retries < maxRetries) {
              retries++
              console.log(`⏳ Cookie not ready yet, retry ${retries}/${maxRetries}...`)
              setTimeout(checkAndRedirect, 500) // Increased delay
            } else {
              // Max retries reached, redirect anyway (middleware will handle it)
              console.warn('⚠️ Cookie verification timed out, redirecting anyway')
              window.location.href = targetUrl
            }
          } catch (err) {
            console.error('Cookie check error:', err)
            if (retries < maxRetries) {
              retries++
              setTimeout(checkAndRedirect, 500)
            } else {
              // Fallback: redirect anyway - middleware will auto-fix
              console.warn('⚠️ Redirecting despite error - middleware will handle')
              window.location.href = targetUrl
            }
          }
        }
        
        // Start checking immediately
        checkAndRedirect()
      }, 500) // Reduced initial wait
    } catch (err) {
      setError('Failed to verify code. Please try again.')
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    setError('')

    try {
      const response = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to resend code')
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

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No email provided. Please start from the{' '}
              <Link href="/signup" className="text-primary underline">
                sign up page
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    )
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
                We sent a 6-digit code to <strong>{email}</strong>
                <br />
                <span className="text-sm text-muted-foreground mt-2 block">
                  You must verify your email to access FounderMatch features
                </span>
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent>
          {!success ? (
            <>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleVerify()
                }}
                className="space-y-6"
              >
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
                  disabled={loading || code.some(d => d === '')}
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
                    disabled={resending}
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


