'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function FounderLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function check() {
      try {
        const res = await fetch('/api/auth/check', {
          method: 'GET',
          headers: { 'Cache-Control': 'no-store' },
          credentials: 'include',
        })
        const data = await res.json().catch(() => ({}))
        if (!cancelled) {
          // Block ALL founder routes if not verified/approved (i.e., not a member yet)
          if (!res.ok || !data?.verified) {
            // Preserve return path so we can resume after approval
            const ret = encodeURIComponent(pathname || '/founder')
            router.replace(`/signup/thank-you?next=${ret}`)
            return
          }
          setChecking(false)
        }
      } catch {
        if (!cancelled) {
          router.replace('/signup/thank-you')
        }
      }
    }
    check()
    return () => { cancelled = true }
  }, [router, pathname])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Checking membership...
      </div>
    )
  }

  return <>{children}</>
}


