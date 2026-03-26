'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LogOut, Loader2 } from 'lucide-react'
import { CLIENT_STORAGE } from '@/lib/client-storage-keys'

export function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Cache-Control': 'no-store' },
      })

      if (response.ok) {
        try {
          localStorage.removeItem(CLIENT_STORAGE.USER_EMAIL)
          localStorage.removeItem(CLIENT_STORAGE.LOGGED_IN)
          localStorage.removeItem(CLIENT_STORAGE.USER_EMAIL_LEGACY)
          localStorage.removeItem(CLIENT_STORAGE.LOGGED_IN_LEGACY)
        } catch (e) {
          // Ignore localStorage errors
        }
        // Proactively clear cookie in client as well
        document.cookie = 'session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;'
        // Force a hard reload to clear all cached data
        window.location.href = '/'
      } else {
        // Even if API fails, try to clear locally and redirect
        document.cookie = 'session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;'
        window.location.href = '/'
      }
    } catch (error) {
      console.error('Logout error:', error)
      // Fallback: clear cookie and localStorage, then redirect
      try {
        localStorage.removeItem(CLIENT_STORAGE.USER_EMAIL)
        localStorage.removeItem(CLIENT_STORAGE.LOGGED_IN)
        localStorage.removeItem(CLIENT_STORAGE.USER_EMAIL_LEGACY)
        localStorage.removeItem(CLIENT_STORAGE.LOGGED_IN_LEGACY)
      } catch (e) {
        // Ignore localStorage errors
      }
      document.cookie = 'session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;'
      window.location.href = '/'
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={handleLogout}
      disabled={loading}
      className="h-8 px-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/70"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
        </>
      ) : (
        <>
          <LogOut className="h-4 w-4" />
          <span className="hidden md:inline ml-1.5">Log Out</span>
        </>
      )}
    </Button>
  )
}

