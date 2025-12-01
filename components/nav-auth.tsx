'use client'

import { useState, useEffect, useCallback, memo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LogoutButton } from '@/components/logout-button'
import { CreditCounter } from '@/components/credit-counter'
import { User } from 'lucide-react'

export const NavAuth = memo(function NavAuth() {
  const [authState, setAuthState] = useState<{
    authenticated: boolean
    verified: boolean
    email?: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  const checkAuth = useCallback(() => {
    fetch('/api/auth/check', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache'
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Auth check failed')
        return res.json()
      })
      .then(data => {
        setAuthState({
          authenticated: data.authenticated || false,
          verified: data.verified || false,
          email: data.user?.email,
        })
      })
      .catch(() => {
        setAuthState({ authenticated: false, verified: false })
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    let isMounted = true
    
    if (isMounted) {
      checkAuth()
    }
    
    // Listen for storage events (logout from other tabs)
    const handleStorageChange = () => {
      if (isMounted) checkAuth()
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    // Check periodically but less frequently (5 minutes for better performance)
    const interval = setInterval(() => {
      if (isMounted) checkAuth()
    }, 5 * 60 * 1000)
    
    return () => {
      isMounted = false
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [checkAuth])

  // Always render the same structure to prevent hydration mismatch
  // Use consistent gap and structure on server and client
  if (!mounted || loading) {
    return (
      <div className="flex items-center gap-3" suppressHydrationWarning>
        <div className="h-9 w-20 bg-slate-100 animate-pulse rounded-md" />
        <div className="h-9 w-20 bg-slate-100 animate-pulse rounded-md" />
      </div>
    )
  }

  // User is logged in and verified
  if (authState?.authenticated && authState?.verified) {
    return (
      <div className="flex items-center gap-3" suppressHydrationWarning>
        {/* Credit counter - more subtle and compact */}
        <CreditCounter variant="badge" showClaimButton={true} className="hidden lg:flex" />
        
        {/* Divider between credits and user actions */}
        <div className="hidden lg:block h-5 w-px bg-slate-200" />
        
        {/* User actions grouped together */}
        <div className="flex items-center gap-1.5">
          <Link href="/founder/dashboard">
            <Button size="sm" variant="default" className="h-8 px-3 text-sm font-medium shadow-sm">
              Dashboard
            </Button>
          </Link>
          <Link href="/account">
            <Button size="sm" variant="ghost" className="h-8 px-2.5 hidden sm:flex">
              <User className="h-4 w-4" />
              <span className="hidden md:inline ml-1.5">Account</span>
            </Button>
          </Link>
          <LogoutButton />
        </div>
      </div>
    )
  }

  // User not logged in
  return (
    <div className="flex items-center gap-3" suppressHydrationWarning>
      <Link href="/login">
        <Button size="sm" variant="ghost">
          Log In
        </Button>
      </Link>
      <Link href="/signup">
        <Button size="sm">Sign Up</Button>
      </Link>
    </div>
  )
})
