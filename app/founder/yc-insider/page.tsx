import { redirect } from 'next/navigation'

/** Old URL; YC Insider is retired in favor of the founder network hub. */
export default function YcInsiderRedirectPage() {
  redirect('/pricing?from=network')
}
