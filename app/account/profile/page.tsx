import { permanentRedirect } from 'next/navigation'

/** @deprecated Profile lives at `/account`; keep route for bookmarks and external links. */
export default function AccountProfilePage() {
  permanentRedirect('/account')
}
