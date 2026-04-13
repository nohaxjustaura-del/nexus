import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'

/** Old URL; YC Insider is retired in favor of the founder network hub. */
export default async function YcInsiderRedirectPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect(`/signup?next=${encodeURIComponent('/pricing?from=network')}`)
  }
  redirect('/pricing?from=network')
}
