import type { Metadata } from 'next'
import { NotFoundClient } from '@/app/not-found-client'

export const metadata: Metadata = {
  title: 'Page not found',
}

export default function NotFound() {
  return <NotFoundClient />
}
