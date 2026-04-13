import { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site-url'
import { RESOURCE_PARTNERS } from '@/lib/partner-resources'
import { legacyNexusExtrasEnabled } from '@/lib/nexus-surface-flags'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl()
  const now = new Date()

  const dynamicPages: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }> = [
    { path: '', priority: 1.0, changeFrequency: 'daily' },
    { path: '/founder/discover', priority: 0.9, changeFrequency: 'daily' },
    { path: '/founder/ai-analysis', priority: 0.9, changeFrequency: 'weekly' },
    { path: '/pricing', priority: 0.9, changeFrequency: 'weekly' },
  ]

  const networkPages: Array<{
    path: string
    priority: number
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
  }> = legacyNexusExtrasEnabled()
    ? [
        { path: '/founder/network', priority: 0.7, changeFrequency: 'weekly' },
        ...RESOURCE_PARTNERS.map((p) => ({
          path: `/founder/network/${p.slug}` as const,
          priority: 0.65,
          changeFrequency: 'weekly' as const,
        })),
      ]
    : []

  const staticPages: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }> = [
    { path: '/founder', priority: 0.85, changeFrequency: 'weekly' },
    { path: '/investor', priority: 0.85, changeFrequency: 'weekly' },
    { path: '/about', priority: 0.8, changeFrequency: 'monthly' },
    ...networkPages,
    { path: '/contact', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/blog', priority: 0.6, changeFrequency: 'weekly' },
    { path: '/vc-guide', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/vc/claim', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/login', priority: 0.5, changeFrequency: 'monthly' },
    { path: '/signup', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/legal', priority: 0.35, changeFrequency: 'yearly' },
    { path: '/dmca', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/cookies', priority: 0.3, changeFrequency: 'yearly' },
  ]

  return [
    ...dynamicPages.map(page => ({
      url: `${baseUrl}${page.path}`,
      lastModified: now,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })),
    ...staticPages.map(page => ({
      url: `${baseUrl}${page.path}`,
      lastModified: now,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })),
  ] as MetadataRoute.Sitemap
}




