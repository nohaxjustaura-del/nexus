import { redirect } from 'next/navigation'

/** Root admin URL — send users to the overview. */
export default function AdminIndexPage() {
  redirect('/admin/dashboard')
}
