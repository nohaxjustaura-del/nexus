/**
 * 🚀 INVESTOR CACHE - Fast VC Data Access
 * 
 * Caches investor data to avoid repeated database queries
 * Investors change rarely, so caching them is very effective
 */

import { Investor } from '@prisma/client'
import { db } from './db'

interface CachedInvestors {
  data: Investor[]
  timestamp: number
}

let investorCache: CachedInvestors | null = null
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes (investors don't change often)

/**
 * Get all active investors with caching
 * 🚀 PERFORMANCE: Avoids repeated DB queries for investor data
 */
export async function getCachedInvestors(): Promise<Investor[]> {
  const now = Date.now()
  
  // Return cached data if still valid
  if (investorCache && now - investorCache.timestamp < CACHE_TTL) {
    return investorCache.data
  }
  
  // Fetch fresh data
  // NOTE: Investor model does NOT have an `active` field – use profile flags instead
  const investors = await db.investor.findMany({
    where: {
      isPublic: true,
    },
    // 🚀 OPTIMIZED: Select only needed fields to reduce memory
    select: {
      id: true,
      name: true,
      email: true,
      firmName: true,
      verified: true,
      bio: true,
      photoUrl: true,
      logoUrl: true,
      stages: true,
      sectors: true,
      checkMin: true,
      checkMax: true,
      geoFocus: true,
      leadFollow: true,
      fundSize: true,
      valueAddTags: true,
      ethicsTags: true,
      personalityType: true,
      decisionSpeed: true,
      applicationUrl: true,
      fundType: true,
      thesis: true,
      proofPoints: true,
      portfolio: true,
      ownershipTarget: true,
      responsivenessScore: true,
      notableInvestments: true,
      linkedinUrl: true,
      websiteUrl: true,
      twitterUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  }) as Investor[]
  
  // Cache the result
  investorCache = {
    data: investors,
    timestamp: now,
  }
  
  return investors
}

/**
 * Clear the investor cache (call when investors are updated)
 */
export function clearInvestorCache(): void {
  investorCache = null
}

/**
 * Get a single investor by ID (with caching)
 */
export async function getCachedInvestorById(id: string): Promise<Investor | null> {
  const investors = await getCachedInvestors()
  return investors.find(inv => inv.id === id) || null
}
