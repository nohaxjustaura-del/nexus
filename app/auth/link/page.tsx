'use client'

import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail } from 'lucide-react'
import { BRAND_NAME } from '@/lib/brand'

export default function AuthLinkPage() {
  const params = useSearchParams()
  const tokenHash = params.get('token_hash') || ''
  const type = params.get('type') || 'magiclink'
  const next = params.get('next') || '/founder/dashboard'
  const email = params.get('email') || ''

  const continueHref = `/api/auth/callback?confirm=1&token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(type)}&next=${encodeURIComponent(next)}`

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-950 rounded-full flex items-center justify-center mb-2">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <CardTitle>Continue to {BRAND_NAME}</CardTitle>
          <CardDescription>
            {email ? (
              <>Sign-in request for <strong>{email}</strong>.</>
            ) : (
              <>Finish your sign-in securely.</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full" onClick={() => window.location.assign(continueHref)}>
            Continue Sign In
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            We require one manual tap to prevent email security scanners from consuming your one-time sign-in link.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

