'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LayoutDashboard, CircleUserRound, User, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

export function VCSubnav() {
  const pathname = usePathname()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/check', { credentials: 'include' })
      .then((r) => r.json().catch(() => ({})))
      .then((data) => {
        if (!cancelled) setIsAdmin(Boolean(data?.isAdmin))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const links = [
    { href: '/vc/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/vc/claim', label: 'Profile', icon: CircleUserRound },
    { href: '/account', label: 'Account', icon: User },
    ...(isAdmin ? [{ href: '/admin/dashboard', label: 'Admin', icon: Shield }] : []),
  ] as const

  return (
    <div
      className="sticky top-14 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md sm:top-16"
      role="navigation"
      aria-label="VC portal"
    >
      <div className="container mx-auto max-w-7xl px-4 sm:px-6">
        <div className="-mx-1 flex gap-0.5 overflow-x-auto py-2">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname?.startsWith(`${href}/`)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary/15 text-foreground ring-1 ring-primary/25'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5 opacity-70" aria-hidden />
                {label}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
