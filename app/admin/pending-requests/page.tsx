import { redirect } from 'next/navigation'

/** Legacy URL — everything is handled from Admin → Overview. */
export default function PendingRequestsRedirectPage() {
  redirect('/admin/dashboard')
}
