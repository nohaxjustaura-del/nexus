import type { Metadata } from 'next'
import { getSiteUrl } from '@/lib/site-url'
import { BRAND_DEFAULT_TITLE, BRAND_NAME, BRAND_TITLE_TEMPLATE } from '@/lib/brand'

/** Marketing copy without live DB counts — used for the root layout so metadata skips Prisma on every route. */
export const STATIC_SITE_DESCRIPTION = `NEXUS is fundraising intelligence built for investor fit. It reads your pitch like an investor would, scores fit, and ranks verified VCs, angels, accelerators, and corporate venture arms. You get a shortlist tied to real mandates, not a generic chatbot list of who might invest.`

export const STATIC_OG_DESCRIPTION = `Verified investors ranked to your story and stage. Shortlists, rationale, and outreach in one workflow, not a one-off answer from a general chat model.`

export function buildRootStaticMetadata(): Metadata {
  const siteUrl = getSiteUrl()
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: BRAND_DEFAULT_TITLE,
      template: BRAND_TITLE_TEMPLATE,
    },
    description: STATIC_SITE_DESCRIPTION,
    keywords: [
      'fundraising match engine',
      'investor matching',
      'founder fundraising',
      'startup funding',
      'pitch deck analysis',
      'VC matching',
      'angel investors',
      'accelerator matching',
      'corporate venture',
      'investor discovery',
    ],
    authors: [{ name: BRAND_NAME, url: siteUrl }],
    creator: BRAND_NAME,
    publisher: BRAND_NAME,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: siteUrl,
      siteName: BRAND_NAME,
      title: BRAND_DEFAULT_TITLE,
      description: STATIC_OG_DESCRIPTION,
    },
    twitter: {
      card: 'summary_large_image',
      title: BRAND_DEFAULT_TITLE,
      description:
        'Ranked investor shortlists from your pitch using verified mandates, clear scores, and workflow tools. More specific than asking a general AI who to email.',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    manifest: '/manifest.json',
    verification: {},
  }
}
