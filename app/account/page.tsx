import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { isAdminEmail } from '@/lib/constants'
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

    return (
      <AccountPageClient
        email={user.email}
        emailVerified={user.emailVerified}
        userType={user.userType}
        isAdmin={isAdminEmail(user.email)}
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
