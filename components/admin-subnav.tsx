'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, UserCheck, CreditCard, Building2, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/approvals', label: 'Signups', icon: UserCheck },
  { href: '/admin/founders', label: 'Founder IDs', icon: CreditCard },
  { href: '/admin/vcs', label: 'VCs', icon: Building2 },
  { href: '/admin/more', label: 'More', icon: Wrench },
] as const

export function AdminSubnav() {
  const pathname = usePathname()

  return (
    <div
      className="sticky top-14 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md sm:top-16"
      role="navigation"
      aria-label="Admin"
    >
      <div className="container mx-auto max-w-7xl px-4 sm:px-6">
        <div className="-mx-1 flex gap-0.5 overflow-x-auto py-2 [scrollbar-width:thin]">
          {items.map(({ href, label, icon: Icon }) => {
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
