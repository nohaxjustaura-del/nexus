import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { FounderProfileEditor } from './founder-profile-editor'

export const dynamic = 'force-dynamic'

export default async function AccountProfilePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login?redirect=/account/profile')
  }

  if (!user.emailVerified) {
    redirect(`/verify?redirect=/account/profile&email=${encodeURIComponent(user.email)}`)
  }

  const userType = user.userType || 'founder'

  if (userType === 'vc') {
    redirect('/vc/claim')
  }
  if (userType === 'mentor') {
    redirect('/account')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/40 via-background to-background">
      <div className="container mx-auto max-w-3xl px-4 py-8 md:py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Founder profile</h1>
          <p className="mt-2 text-muted-foreground max-w-xl">
            Update the same details you provided during onboarding. Your login email stays the same; use an alternate
            email if you want investors to reach you somewhere else.
          </p>
        </header>
        <FounderProfileEditor sessionEmail={user.email} />
      </div>
    </div>
  )
}
