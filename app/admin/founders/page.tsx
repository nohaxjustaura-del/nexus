import { redirect } from 'next/navigation'

/** Founder ID review merged into `/admin/approvals`. */
export default function AdminFoundersRedirectPage() {
  redirect('/admin/approvals')
}
