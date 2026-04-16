import { Metadata } from 'next'
import { getSiteUrl } from '@/lib/site-url'
import { BRAND_DEFAULT_TITLE, BRAND_NAME } from '@/lib/brand'

interface SEOProps {
  title?: string
  description?: string
  image?: string
  url?: string
  type?: 'website' | 'article'
  noindex?: boolean
}

const siteUrl = getSiteUrl()

const defaultMetadata = {
  title: BRAND_DEFAULT_TITLE,
  description:
    'NEXUS ranks verified VCs, angels, and programs to your pitch using stage, sector, thesis, and story fit. Results use maintained investor data, not a one-off reply from a general chat model.',
  image: `${siteUrl}/opengraph-image`,
  url: siteUrl,
}

export function generateSEO({
  title,
  description,
  image,
  url,
  type = 'website',
  noindex = false,
}: SEOProps = {}): Metadata {
  const metadata: Metadata = {
    title: title ? `${title} | ${BRAND_NAME}` : defaultMetadata.title,
    description: description || defaultMetadata.description,
    openGraph: {
      type,
      title: title || defaultMetadata.title,
      description: description || defaultMetadata.description,
      images: [
        {
          url: image || defaultMetadata.image,
          width: 1200,
          height: 630,
          alt: title || defaultMetadata.title,
        },
      ],
      url: url || defaultMetadata.url,
      siteName: BRAND_NAME,
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: title || defaultMetadata.title,
      description: description || defaultMetadata.description,
      images: [image || defaultMetadata.image],
    },
    alternates: {
      canonical: url || defaultMetadata.url,
    },
  }

  if (noindex) {
    metadata.robots = {
      index: false,
      follow: false,
    }
  }

  return metadata
}

// JSON-LD structured data
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND_NAME,
    description:
      'Fundraising intelligence for founders: ranked investor matches from verified data with clear reasons, not open-ended chat answers.',
    url: siteUrl,
    logo: `${siteUrl}/nexus-logo.svg`,
    sameAs: [
      // Add social media URLs here
    ],
  }
}

export function generateWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: BRAND_NAME,
    url: siteUrl,
    description:
      'Fundraising intelligence for founders: ranked investor matches from verified data with clear reasons, not open-ended chat answers.',
  }
}

export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}




