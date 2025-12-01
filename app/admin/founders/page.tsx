import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

async function fetchVerifications() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_URL || ''}/api/admin/founders/verification`, { cache: 'no-store' })
  if (!res.ok) return { items: [] }
  return res.json()
}

async function updateStatus(email: string, action: 'approve' | 'reject') {
  "use server"
  // 1) Update founder verification status
  await fetch(`${process.env.NEXT_PUBLIC_URL || ''}/api/admin/founders/verification/${encodeURIComponent(email)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  })
  // 2) If approved, also approve account access (membership)
  if (action === 'approve') {
    await fetch(`${process.env.NEXT_PUBLIC_URL || ''}/api/admin/users/approve/${encodeURIComponent(email)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export default async function AdminFoundersPage() {
  const { items = [] } = await fetchVerifications()
  const pending = items.filter((i: any) => i.status === 'pending')

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Founder Verifications</CardTitle>
          <CardDescription>Review and approve or reject identity submissions</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {pending.length === 0 && (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground text-center">
              No pending verifications.
            </CardContent>
          </Card>
        )}
        {pending.map((item: any) => (
          <Card key={item.email}>
            <CardHeader>
              <CardTitle className="text-base">{item.email}</CardTitle>
              <CardDescription>Submitted: {new Date(item.submittedAt).toLocaleString()}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-2">
              <div className="text-sm truncate">
                <div>File: {item.url || 'n/a'}</div>
                <a href={`/admin/founders/${encodeURIComponent(item.email)}`} className="text-xs underline underline-offset-4">
                  View full signup details
                </a>
              </div>
              <div className="flex gap-2">
                <a
                  className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm"
                  href={`/api/admin/founders/verification/file/${encodeURIComponent(item.email)}`}
                >
                  Download
                </a>
                <form action={async () => { 'use server'; await updateStatus(item.email, 'reject') }}>
                  <Button variant="outline" size="sm">Reject</Button>
                </form>
                <form action={async () => { 'use server'; await updateStatus(item.email, 'approve') }}>
                  <Button size="sm">Approve</Button>
                </form>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}


