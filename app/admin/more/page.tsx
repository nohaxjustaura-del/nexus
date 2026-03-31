import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { isAdminEmail } from '@/lib/constants'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Database, MessageSquare } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const tools = [
  {
    href: '/admin/training-data',
    title: 'Training data',
    description: 'Model and dataset maintenance',
    icon: Database,
  },
  {
    href: '/admin/yc-insider-requests',
    title: 'Partner founder requests',
    description: 'Ask / Book submissions from premium users',
    icon: MessageSquare,
  },
] as const

export default async function AdminMorePage() {
  const user = await getCurrentUser(false)
  if (!user || !isAdminEmail(user.email)) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">More tools</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Day-to-day approvals live on <Link href="/admin/dashboard" className="font-medium text-primary hover:underline">Overview</Link>.
            Use these pages only when you need them.
          </p>
        </div>

        <ul className="space-y-3">
          {tools.map(({ href, title, description, icon: Icon }) => (
            <li key={href}>
              <Link href={href}>
                <Card className="transition-colors hover:border-primary/30">
                  <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2 pt-5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                    </span>
                    <div>
                      <CardTitle className="text-base">{title}</CardTitle>
                      <CardDescription>{description}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-5 pt-0">
                    <span className="text-sm font-medium text-primary">Open →</span>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
