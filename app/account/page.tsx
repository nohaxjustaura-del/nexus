import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { AccountPageClient } from './account-page-client'

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      redirect('/login?redirect=/account')
    }

    if (!user.emailVerified) {
      redirect(`/verify?redirect=/account&email=${encodeURIComponent(user.email)}`)
    }

    const userType = (user.userType || 'founder').toLowerCase()
    let showFounderProfileEditor = userType === 'founder' || userType === 'mentor'
    if (userType === 'vc' || userType === 'investor') {
      const founder = await db.founder.findUnique({
        where: { email: user.email },
        select: { id: true },
      })
      showFounderProfileEditor = Boolean(founder)
    }

    return (
      <AccountPageClient
        email={user.email}
        emailVerified={user.emailVerified}
        userType={user.userType}
        showFounderProfileEditor={showFounderProfileEditor}
      />
    )
  } catch (error) {
    const err = error as { digest?: string; message?: string }
    if (typeof err?.digest === 'string' && err.digest.startsWith('NEXT_REDIRECT')) {
      throw error
    }
    console.error('Account page error:', error)
    throw error
  }
}
