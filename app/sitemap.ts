import { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site-url'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl()
  
  const staticPages = [
    '',
    '/pricing',
    '/about',
    '/contact',
    '/privacy',
    '/terms',
    '/disclaimer',
    '/security',
    '/dmca',
    '/verification-notice',
    '/founder/discover',
    '/founder/ai-analysis',
    '/vc/claim',
    '/login',
    '/signup',
  ]

  return staticPages.map(page => ({
    url: `${baseUrl}${page}`,
    lastModified: new Date(),
    changeFrequency: page === '' ? 'daily' : 'weekly',
    priority: page === '' ? 1.0 : 0.8,
  })) as MetadataRoute.Sitemap
}




