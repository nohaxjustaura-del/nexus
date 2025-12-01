'use client'

import Link from 'next/link'

interface ProtectedLinkProps {
  href: string
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

// Simplified: Let middleware handle protection
// This component just renders a link - middleware will redirect if not authenticated
export function ProtectedLink({ href, children, className, onClick }: ProtectedLinkProps) {
  return (
    <Link href={href} onClick={onClick} className={className}>
      {children}
    </Link>
  )
}

