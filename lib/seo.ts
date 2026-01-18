import { Metadata } from 'next'

interface SEOProps {
  title?: string
  description?: string
  image?: string
  url?: string
  type?: 'website' | 'article'
  noindex?: boolean
}

const defaultMetadata = {
  title: 'FounderMatch - Find Your Perfect Investor',
  description: 'AI-powered platform connecting founders with compatible VCs, angels, and mentors. Evidence-based matching by stage, sector, vision, and working style.',
  image: '/og-image.png',
  url: 'https://foundermatch.com',
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
    title: title ? `${title} | FounderMatch` : defaultMetadata.title,
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
      siteName: 'FounderMatch',
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
    name: 'FounderMatch',
    description: 'AI-powered platform connecting founders with compatible VCs',
    url: 'https://foundermatch.com',
    logo: 'https://foundermatch.com/logo.png',
    sameAs: [
      // Add social media URLs here
    ],
  }
}

export function generateWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'FounderMatch',
    url: 'https://foundermatch.com',
    description: 'AI-powered platform connecting founders with compatible VCs',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://foundermatch.com/search?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
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




