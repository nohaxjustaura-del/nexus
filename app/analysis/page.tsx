import type { Metadata } from 'next'
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand'
import { getSiteUrl } from '@/lib/site-url'
import AnalysisClient from './analysis-client'

const siteUrl = getSiteUrl()

export const metadata: Metadata = {
  title: 'Analysis',
  description: `Personalized fundraising assessment, pitch feedback, and investor-style matches from your onboarding profile. ${BRAND_TAGLINE}.`,
  robots: {
    index: false,
    follow: true,
  },
  openGraph: {
    title: `Analysis | ${BRAND_NAME}`,
    description: `Roadmap and match-style output from your founder profile. ${BRAND_TAGLINE}.`,
    url: `${siteUrl}/analysis`,
    siteName: BRAND_NAME,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: `Analysis | ${BRAND_NAME}`,
    description: `Your ${BRAND_NAME} fundraising readout from onboarding: assessment, pitch notes, and match cards.`,
  },
}

export default function AnalysisPage() {
  return <AnalysisClient />
}
