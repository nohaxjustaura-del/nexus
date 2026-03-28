import { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site-url'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl()
  const now = new Date()

  const dynamicPages: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }> = [
    { path: '', priority: 1.0, changeFrequency: 'daily' },
    { path: '/founder/discover', priority: 0.9, changeFrequency: 'daily' },
    { path: '/founder/ai-analysis', priority: 0.9, changeFrequency: 'weekly' },
    { path: '/pricing', priority: 0.9, changeFrequency: 'weekly' },
  ]

  const staticPages: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }> = [
    { path: '/about', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/contact', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/blog', priority: 0.6, changeFrequency: 'weekly' },
    { path: '/vc-guide', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/vc/claim', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/login', priority: 0.5, changeFrequency: 'monthly' },
    { path: '/signup', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/disclaimer', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/security', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/dmca', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/cookies', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/verification-notice', priority: 0.3, changeFrequency: 'yearly' },
  ]

  const staticDate = new Date('2025-01-01')

  return [
    ...dynamicPages.map(page => ({
      url: `${baseUrl}${page.path}`,
      lastModified: now,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })),
    ...staticPages.map(page => ({
      url: `${baseUrl}${page.path}`,
      lastModified: staticDate,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })),
  ] as MetadataRoute.Sitemap
}




