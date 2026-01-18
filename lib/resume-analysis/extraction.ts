import { ResumeFeatures } from '@/lib/ai'

export function extractSkills(features: ResumeFeatures): string[] {
  const skills: string[] = []
  if (features.skills.programming) skills.push(...features.skills.programming)
  if (features.skills.ml) skills.push(...features.skills.ml)
  if (features.skills.gtm) skills.push(...features.skills.gtm)
  if (features.skills.domain) skills.push(...features.skills.domain)
  if (features.leadership) skills.push('Leadership')
  if (features.yearsExp && features.yearsExp > 3) skills.push('Experienced Founder')
  return [...new Set(skills)].slice(0, 10)
}

export function extractExperiences(features: ResumeFeatures): string[] {
  const exps: string[] = []
  
  features.experience?.forEach(exp => {
    const highlights = exp.highlights?.map(h => `${h.metric}: ${h.value}${h.unit}`).join(', ')
    exps.push(`${exp.title} at ${exp.org}${highlights ? ` (${highlights})` : ''}`)
  })

  if (features.openSource?.stars) {
    exps.push(`Open Source: ${features.openSource.stars}+ GitHub stars`)
  }

  if (features.traction?.revenue) {
    const rev = features.traction.revenue
    const formatted = rev > 1000 ? `$${(rev/1000).toFixed(0)}K` : `$${rev}`
    exps.push(`Traction: ${formatted} revenue`)
  }

  if (features.traction?.users) {
    const users = features.traction.users
    const formatted = users > 1000 ? `${(users/1000).toFixed(0)}K` : users
    exps.push(`${formatted} users`)
  }

  return exps.slice(0, 6)
}

export function extractKeywords(features: ResumeFeatures, founderData: any): string[] {
  const keywords: Set<string> = new Set()
  
  features.experience?.forEach(exp => {
    exp.sectors?.forEach(s => keywords.add(s))
    exp.skills?.forEach(s => keywords.add(s))
  })

  founderData.sectors?.forEach((s: string) => keywords.add(s))
  
  if (features.leadership) keywords.add('Founder')
  if ((features as any).isStudent) keywords.add('Student Founder')
  if (features.openSource?.stars && features.openSource.stars > 100) keywords.add('Open Source Contributor')
  if (features.traction?.revenue) keywords.add('Revenue')
  if (features.traction?.users) keywords.add('User Traction')

  return Array.from(keywords).slice(0, 12)
}


