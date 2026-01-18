import { ResumeFeatures } from '@/lib/ai'

export function resumeHasMetrics(features: ResumeFeatures): boolean {
  return features.experience?.some(exp => 
    exp.highlights && exp.highlights.length > 0
  ) || false
}

export function identifyGaps(
  features: ResumeFeatures,
  founderData: any,
  context: any
): string[] {
  const gaps: string[] = []
  const sectors = founderData.sectors || []

  // Check for missing metrics
  if (!features.traction?.revenue && !features.traction?.users) {
    gaps.push('No quantifiable traction metrics (users, revenue, or growth)')
  }

  // Check for sector-specific gaps
  if (sectors.includes('AI/ML')) {
    if (!features.skills?.ml || features.skills.ml.length === 0) {
      gaps.push('Limited ML/AI technical skills demonstrated')
    }
    if (!features.traction?.users && !resumeHasMetrics(features)) {
      gaps.push('Missing model performance metrics or evaluation benchmarks')
    }
  }

  if (sectors.includes('Developer Tools')) {
    if (!features.openSource?.stars) {
      gaps.push('No GitHub stars or open-source traction mentioned')
    }
  }

  if (sectors.includes('SaaS') || sectors.includes('Enterprise')) {
    if (!features.traction?.revenue) {
      gaps.push('Missing revenue (MRR/ARR) metrics')
    }
  }

  if (sectors.includes('Fintech')) {
    if (!/regulatory|compliance|license|bank partner/i.test(JSON.stringify(features))) {
      gaps.push('No mention of regulatory strategy or banking partnerships')
    }
  }

  // Generic gaps
  if (!features.openSource && sectors.some((s: string) => ['AI/ML', 'Developer Tools', 'SaaS'].includes(s))) {
    gaps.push('Consider adding GitHub profile or open-source projects')
  }

  if (gaps.length === 0) {
    gaps.push('Strong profile overall! Focus on highlighting specific metrics')
  }

  return gaps.slice(0, 4)
}

export function generateSmartSuggestions(
  features: ResumeFeatures,
  founderData: any,
  context: any
): string[] {
  const suggestions: string[] = []
  const sectors = founderData.sectors || []

  // Student-specific suggestions
  if (context.isStudent) {
    suggestions.push('🎓 Target student-focused VCs: Dorm Room Fund, 1517 Fund, Bay Area Angels')
    suggestions.push('💪 Emphasize full-time commitment: "Dropped out to pursue full-time" or "Ready to go all-in"')
  }

  // Technical founder suggestions
  if (context.isTechnical) {
    if (!context.hasOpenSource) {
      suggestions.push('💻 For DevTools VCs: Open-source a component and target 200+ GitHub stars')
    }
    if (sectors.includes('AI/ML')) {
      suggestions.push('📊 For AI/ML VCs: Add "Model achieved 95% accuracy, 10x faster than GPT-4"')
    }
  }

  // Sector-specific suggestions
  if (sectors.includes('AI/ML') && !context.hasTraction) {
    suggestions.push('🔬 Include AI metrics: inference costs, evaluation benchmarks, latency improvements')
  }

  if (sectors.includes('SaaS') || sectors.includes('Enterprise')) {
    if (!features.traction?.revenue) {
      suggestions.push('💰 Add revenue metrics: "$15K MRR growing 25% MoM" or "3 enterprise pilots at $50K each"')
    }
    suggestions.push('📈 Include sales efficiency: "CAC payback in 8 months" or "Win rate: 35%"')
  }

  if (sectors.includes('Developer Tools')) {
    suggestions.push('⭐ Show OSS traction: "350+ GitHub stars, 50 weekly downloads, 15 contributors"')
    suggestions.push('⚡ Emphasize time-to-value: "Developers ship in <10 minutes"')
  }

  if (sectors.includes('Fintech')) {
    suggestions.push('🏦 Mention regulatory wins: "Partnered with Evolve Bank" or "Money transmitter license approved"')
  }

  if (sectors.includes('Climate Tech')) {
    suggestions.push('🌱 Include sustainability metrics: "TRL 7, pilot at 3 sites, 1000 tons CO2/year reduction"')
  }

  if (sectors.includes('Consumer')) {
    suggestions.push('📱 Add retention: "D7: 45%, D30: 28%, DAU/MAU: 0.35"')
  }

  // Generic high-impact
  if (suggestions.length < 3) {
    suggestions.push('🎯 Quantify every achievement: "Grew X from A to B in C months"')
    suggestions.push('🔗 Add product demo link, GitHub, or live product URL')
  }

  return suggestions.slice(0, 5)
}


