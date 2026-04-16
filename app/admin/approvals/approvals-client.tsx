'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AddEmailForm } from '@/components/admin/add-email-form'
import { FounderOnboardingQueue } from '@/components/admin/founder-onboarding-queue'

export function AdminApprovalsClient() {
  const [queueKey, setQueueKey] = useState(0)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Founder signups &amp; ID verification
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            One queue for account approval and founder ID review. The list stays short and recent; search across emails
            and names, expand a row for full profile and document preview. Pending items also surface on Overview.
          </p>
        </div>

        <FounderOnboardingQueue key={queueKey} />

        <Card className="mt-10 border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Add email manually</CardTitle>
            <CardDescription>Put someone on the pending list without them signing up first.</CardDescription>
          </CardHeader>
          <CardContent>
            <AddEmailForm onSuccess={() => setQueueKey((k) => k + 1)} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
