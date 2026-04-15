'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const items = [
  { href: '/founder/dashboard', label: 'Hub' },
  { href: '/founder/discover', label: 'Discover' },
  { href: '/founder/matches', label: 'Matches' },
  { href: '/founder/bookmarks', label: 'Bookmarks' },
  { href: '/founder/my-analyses', label: 'Analyses' },
  { href: '/founder/network', label: 'Network' },
] as const

export function FounderWorkspaceTabs() {
  const pathname = usePathname()

  return (
    <nav
      className="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Founder workspace sections"
    >
      {items.map(({ href, label }) => {
        const active = pathname === href || pathname?.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              active
                ? 'bg-card text-foreground ring-1 ring-border/70'
                : 'text-muted-foreground hover:bg-muted/65 hover:text-foreground',
            )}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
