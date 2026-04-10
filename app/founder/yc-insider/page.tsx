import { redirect } from 'next/navigation'

/** Old URL; YC Insider is retired in favor of Resources. */
export default function YcInsiderRedirectPage() {
  redirect('/pricing?from=resources')
}
