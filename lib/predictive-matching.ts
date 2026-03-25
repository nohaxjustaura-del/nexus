/**
 * ===============================================================================
 * PREDICTIVE VC MATCHING - Machine Learning Layer
 * ===============================================================================
 * 
 * Features:
 * - Learns from user interactions (clicks, applications, bookmarks)
 * - Collaborative filtering (founders similar to you liked X)
 * - Trend-aware scoring (hot sectors, emerging VCs)
 * - Personalized ranking based on founder profile
 * - A/B testing for match algorithm improvements
 * 
 * This system gets smarter over time as more data flows through it.
 */

import { db } from './db'
import { logger } from './logger'
import type { Investor } from '@prisma/client'

/**
 * User interaction types (weighted by signal strength)
 */
export enum InteractionType {
  VIEW = 1,           // Viewed VC profile
  BOOKMARK = 3,       // Bookmarked VC
  APPLICATION = 5,    // Applied to VC
  RESPONSE = 10,      // Got response from VC
  MEETING = 15,       // Got meeting with VC
}

/**
 * Interaction event
 */
export interface InteractionEvent {
  founderId: string
  investorId: string
  type: InteractionType
  timestamp: Date
  metadata?: Record<string, any>
}

/**
 * In-memory interaction store (would move to Redis/DB for production)
 */
const interactionHistory: InteractionEvent[] = []
const MAX_HISTORY = 10000

/**
 * VC performance scores (learned from interactions)
 */
interface VCPerformance {
  investorId: string
  impressionScore: number    // How often shown
  engagementScore: number    // How often clicked
  conversionScore: number    // How often applied to
  responseScore: number      // How often responds
  qualityScore: number       // Overall quality (normalized 0-100)
}

const vcPerformance = new Map<string, VCPerformance>()

/**
 * Founder similarity clusters (collaborative filtering)
 */
interface FounderCluster {
  founderId: string
  clusterMembers: string[]  // Similar founders
  preferredInvestors: string[]  // VCs this cluster likes
}

const founderClusters = new Map<string, FounderCluster>()

/**
 * 🚀 MAIN: Get personalized VC recommendations
 */
export async function getPersonalizedVCRecommendations(
  founderId: string,
  baseMatches: Array<{ investor: Investor; score: number }>,
  limit: number = 20
): Promise<Array<{ investor: Investor; score: number; personalizedScore: number; reason: string }>> {
  // Get founder's interaction history
  const founderInteractions = getFounderInteractions(founderId)
  
  // Get similar founders' preferences
  const similarFounders = await findSimilarFounders(founderId)
  const collaborativeSignals = getCollaborativeSignals(similarFounders)
  
  // Apply personalization to each match
  const personalized = baseMatches.map(match => {
    let personalizedScore = match.score
    const reasons: string[] = []
    
    // 1. INTERACTION HISTORY: Boost VCs similar to ones founder engaged with
    const interactionBoost = calculateInteractionBoost(
      match.investor,
      founderInteractions
    )
    personalizedScore += interactionBoost
    if (interactionBoost > 5) {
      reasons.push(`Similar to VCs you've shown interest in`)
    }
    
    // 2. COLLABORATIVE FILTERING: Boost VCs that similar founders liked
    const collaborativeBoost = calculateCollaborativeBoost(
      match.investor.id,
      collaborativeSignals
    )
    personalizedScore += collaborativeBoost
    if (collaborativeBoost > 5) {
      reasons.push(`Popular with founders like you`)
    }
    
    // 3. VC QUALITY SCORE: Boost high-performing VCs
    const performance = vcPerformance.get(match.investor.id)
    if (performance) {
      const qualityBoost = (performance.qualityScore - 50) / 5 // -10 to +10
      personalizedScore += qualityBoost
      if (performance.qualityScore > 75) {
        reasons.push(`High response rate from this VC`)
      }
    }
    
    // 4. TRENDING VCs: Boost VCs with recent momentum
    const trendingBoost = calculateTrendingBoost(match.investor.id)
    personalizedScore += trendingBoost
    if (trendingBoost > 3) {
      reasons.push(`Trending VC with recent activity`)
    }
    
    // 5. DIVERSITY: Slightly penalize overrepresented VCs to promote discovery
    const diversityPenalty = calculateDiversityPenalty(
      match.investor.firmName,
      baseMatches
    )
    personalizedScore -= diversityPenalty
    
    return {
      ...match,
      personalizedScore: Math.max(0, Math.min(100, personalizedScore)),
      reason: reasons.length > 0 ? reasons[0] : 'Good match for your profile',
    }
  })
  
  // Re-sort by personalized score
  return personalized
    .sort((a, b) => b.personalizedScore - a.personalizedScore)
    .slice(0, limit)
}

/**
 * Track user interaction (learning signal)
 */
export async function trackInteraction(event: InteractionEvent) {
  // Add to history
  interactionHistory.push(event)
  
  // Trim if too large
  if (interactionHistory.length > MAX_HISTORY) {
    interactionHistory.shift()
  }
  
  // Update VC performance scores
  updateVCPerformance(event)
  
  // Update founder clusters (async, non-blocking)
  updateFounderClusters(event.founderId).catch(err => {
    logger.error('[PREDICTIVE-MATCHING] Cluster update failed:', err)
  })
  
  logger.log(`[PREDICTIVE-MATCHING] Tracked ${InteractionType[event.type]} for ${event.investorId}`)
}

/**
 * Get founder's interaction history
 */
function getFounderInteractions(founderId: string): InteractionEvent[] {
  return interactionHistory.filter(e => e.founderId === founderId)
}

/**
 * Calculate boost based on founder's past interactions
 */
function calculateInteractionBoost(
  investor: Investor,
  interactions: InteractionEvent[]
): number {
  if (interactions.length === 0) return 0

  const interactedVCs = new Set(interactions.map((i) => i.investorId))

  if (interactedVCs.has(investor.id)) {
    return 10
  }

  const byInvestor = new Map<string, InteractionType[]>()
  for (const e of interactions) {
    const list = byInvestor.get(e.investorId) ?? []
    list.push(e.type)
    byInvestor.set(e.investorId, list)
  }

  return calculateVCSimilarity(investor, byInvestor)
}

/**
 * ===============================================================================
 * SECTOR/STAGE SIMILARITY MATRIX
 * ===============================================================================
 * 
 * Calculates how similar two VCs are based on their focus areas
 * Used for collaborative filtering: "Founders who liked X also liked Y"
 */

interface SimilarityWeights {
  sectorOverlap: number
  stageOverlap: number
  checkSizeProximity: number
  geoOverlap: number
}

const SIMILARITY_WEIGHTS: SimilarityWeights = {
  sectorOverlap: 0.4,      // 40% weight
  stageOverlap: 0.3,        // 30% weight
  checkSizeProximity: 0.2,  // 20% weight
  geoOverlap: 0.1,          // 10% weight
}

const INTERACTION_WEIGHTS: Record<InteractionType, number> = {
  [InteractionType.VIEW]: 1,
  [InteractionType.BOOKMARK]: 3,
  [InteractionType.APPLICATION]: 5,
  [InteractionType.RESPONSE]: 10,
  [InteractionType.MEETING]: 15,
}

/**
 * Calculate similarity between a VC and VCs the founder has interacted with
 */
function calculateVCSimilarity(
  vc: any,
  founderInteractions: Map<string, InteractionType[]>
): number {
  if (founderInteractions.size === 0) return 0
  
  let totalSimilarity = 0
  let totalWeight = 0
  
  // Compare with each VC the founder has interacted with
  for (const [otherVcId, interactions] of founderInteractions.entries()) {
    // Weight by interaction strength (bookmarks matter more than views)
    const interactionWeight = interactions.reduce((sum, type) => {
      return sum + INTERACTION_WEIGHTS[type]
    }, 0)
    
    // Don't compare with self
    if (vc.id === otherVcId) continue
    
    // Get the other VC's data (simplified - in production, fetch from DB)
    // For now, assume we have access to basic data
    const similarity = computePairwiseSimilarity(vc, { id: otherVcId })
    
    totalSimilarity += similarity * interactionWeight
    totalWeight += interactionWeight
  }
  
  return totalWeight > 0 ? totalSimilarity / totalWeight : 0
}

/**
 * Compute similarity between two VCs
 * Returns a score from 0 (completely different) to 1 (identical)
 */
function computePairwiseSimilarity(vc1: any, vc2: any): number {
  let score = 0
  
  // 1. Sector overlap (40% weight)
  const sectors1 = new Set(vc1.sectors || [])
  const sectors2 = new Set(vc2.sectors || [])
  const sectorOverlap = calculateSetOverlap(sectors1, sectors2)
  score += sectorOverlap * SIMILARITY_WEIGHTS.sectorOverlap
  
  // 2. Stage overlap (30% weight)
  const stages1 = new Set(vc1.stages || [])
  const stages2 = new Set(vc2.stages || [])
  const stageOverlap = calculateSetOverlap(stages1, stages2)
  score += stageOverlap * SIMILARITY_WEIGHTS.stageOverlap
  
  // 3. Check size proximity (20% weight)
  const checkProximity = calculateCheckSizeProximity(
    vc1.checkMin || 0,
    vc1.checkMax || 0,
    vc2.checkMin || 0,
    vc2.checkMax || 0
  )
  score += checkProximity * SIMILARITY_WEIGHTS.checkSizeProximity
  
  // 4. Geography overlap (10% weight)
  const geo1 = new Set(vc1.geoFocus || [])
  const geo2 = new Set(vc2.geoFocus || [])
  const geoOverlap = calculateSetOverlap(geo1, geo2)
  score += geoOverlap * SIMILARITY_WEIGHTS.geoOverlap
  
  return score
}

/**
 * Calculate overlap between two sets (Jaccard similarity)
 */
function calculateSetOverlap<T>(set1: Set<T>, set2: Set<T>): number {
  if (set1.size === 0 && set2.size === 0) return 1 // Both empty = perfect match
  if (set1.size === 0 || set2.size === 0) return 0 // One empty = no match
  
  const intersection = new Set([...set1].filter(x => set2.has(x)))
  const union = new Set([...set1, ...set2])
  
  return intersection.size / union.size
}

/**
 * Calculate proximity of check sizes (normalized distance)
 */
function calculateCheckSizeProximity(
  min1: number,
  max1: number,
  min2: number,
  max2: number
): number {
  // Use midpoint for comparison
  const mid1 = (min1 + max1) / 2
  const mid2 = (min2 + max2) / 2
  
  // Calculate relative distance (normalized by the larger midpoint)
  const maxMid = Math.max(mid1, mid2, 1) // Avoid division by zero
  const distance = Math.abs(mid1 - mid2) / maxMid
  
  // Convert distance to similarity (closer = higher score)
  return Math.max(0, 1 - distance)
}

/**
 * Pre-compute similarity matrix for all VCs (optimization)
 * Call this periodically (e.g., nightly) to cache VC-to-VC similarities
 */
export async function precomputeVCSimilarityMatrix(
  investors: any[]
): Promise<Map<string, Map<string, number>>> {
  console.log(`[PREDICTIVE-MATCHING] Pre-computing similarity matrix for ${investors.length} VCs...`)
  
  const similarityMatrix = new Map<string, Map<string, number>>()
  
  // Compute pairwise similarities
  for (let i = 0; i < investors.length; i++) {
    const vc1 = investors[i]
    const similarities = new Map<string, number>()
    
    for (let j = 0; j < investors.length; j++) {
      if (i === j) continue // Skip self-comparison
      
      const vc2 = investors[j]
      const similarity = computePairwiseSimilarity(vc1, vc2)
      
      // Only store significant similarities (>0.3) to save memory
      if (similarity > 0.3) {
        similarities.set(vc2.id, similarity)
      }
    }
    
    similarityMatrix.set(vc1.id, similarities)
  }
  
  console.log(`[PREDICTIVE-MATCHING] Similarity matrix computed with ${similarityMatrix.size} entries`)
  return similarityMatrix
}

/**
 * Find similar founders using clustering
 */
async function findSimilarFounders(founderId: string): Promise<string[]> {
  const cluster = founderClusters.get(founderId)
  if (cluster) {
    return cluster.clusterMembers
  }
  
  // Build cluster on-demand
  await updateFounderClusters(founderId)
  
  return founderClusters.get(founderId)?.clusterMembers || []
}

/**
 * Get collaborative signals (what similar founders liked)
 */
function getCollaborativeSignals(similarFounders: string[]): Map<string, number> {
  const vcScores = new Map<string, number>()
  
  // Aggregate interactions from similar founders
  const similarInteractions = interactionHistory.filter(e =>
    similarFounders.includes(e.founderId)
  )
  
  for (const interaction of similarInteractions) {
    const current = vcScores.get(interaction.investorId) || 0
    vcScores.set(interaction.investorId, current + interaction.type)
  }
  
  return vcScores
}

/**
 * Calculate collaborative filtering boost
 */
function calculateCollaborativeBoost(
  investorId: string,
  collaborativeSignals: Map<string, number>
): number {
  const signal = collaborativeSignals.get(investorId) || 0
  
  // Normalize to 0-10 range
  return Math.min(10, signal / 5)
}

/**
 * Calculate trending boost (VCs with recent momentum)
 */
function calculateTrendingBoost(investorId: string): number {
  const recentWindow = 7 * 24 * 60 * 60 * 1000 // 7 days
  const now = Date.now()
  
  const recentInteractions = interactionHistory.filter(
    e => e.investorId === investorId && now - e.timestamp.getTime() < recentWindow
  )
  
  // More recent interactions = higher trending score
  return Math.min(5, recentInteractions.length / 2)
}

/**
 * Calculate diversity penalty (avoid showing same VCs)
 */
function calculateDiversityPenalty(
  firmName: string,
  allMatches: Array<{ investor: Investor }>
): number {
  // Count how many times this firm appears
  const firmCount = allMatches.filter(m =>
    m.investor.firmName.toLowerCase() === firmName.toLowerCase()
  ).length
  
  // Small penalty for duplicate firms
  return firmCount > 1 ? 2 : 0
}

/**
 * Update VC performance scores based on interactions
 */
function updateVCPerformance(event: InteractionEvent) {
  let performance = vcPerformance.get(event.investorId)
  
  if (!performance) {
    performance = {
      investorId: event.investorId,
      impressionScore: 0,
      engagementScore: 0,
      conversionScore: 0,
      responseScore: 0,
      qualityScore: 50, // Start neutral
    }
    vcPerformance.set(event.investorId, performance)
  }
  
  // Update scores based on event type
  switch (event.type) {
    case InteractionType.VIEW:
      performance.impressionScore += 1
      performance.engagementScore += 0.5
      break
    case InteractionType.BOOKMARK:
      performance.engagementScore += 2
      break
    case InteractionType.APPLICATION:
      performance.conversionScore += 5
      performance.engagementScore += 3
      break
    case InteractionType.RESPONSE:
      performance.responseScore += 10
      performance.qualityScore += 2
      break
    case InteractionType.MEETING:
      performance.responseScore += 15
      performance.qualityScore += 5
      break
  }
  
  // Recalculate overall quality score
  performance.qualityScore = calculateQualityScore(performance)
}

/**
 * Calculate overall VC quality score
 */
function calculateQualityScore(performance: VCPerformance): number {
  const {
    impressionScore,
    engagementScore,
    conversionScore,
    responseScore,
  } = performance
  
  if (impressionScore === 0) return 50 // Neutral for new VCs
  
  // Engagement rate
  const engagementRate = engagementScore / impressionScore
  
  // Conversion rate
  const conversionRate = conversionScore > 0 ? conversionScore / engagementScore : 0
  
  // Response rate
  const responseRate = responseScore > 0 ? responseScore / conversionScore : 0
  
  // Weighted average
  const quality =
    engagementRate * 30 +
    conversionRate * 30 +
    responseRate * 40
  
  // Normalize to 0-100
  return Math.max(0, Math.min(100, quality * 100))
}

/**
 * Update founder clusters (collaborative filtering)
 */
async function updateFounderClusters(founderId: string) {
  try {
    // Get founder profile
    const founder = await db.founder.findUnique({
      where: { id: founderId },
      select: {
        id: true,
        stage: true,
        sectors: true,
        age: true,
        education: true,
        location: true,
      },
    })
    
    if (!founder) return
    
    // Find similar founders (simple similarity for now)
    const allFounders = await db.founder.findMany({
      where: {
        id: { not: founderId },
      },
      select: {
        id: true,
        stage: true,
        sectors: true,
        age: true,
        education: true,
        location: true,
      },
      take: 100, // Limit for performance
    })
    
    // Calculate similarity scores
    const similarities = allFounders.map(f => ({
      founderId: f.id,
      similarity: calculateFounderSimilarity(founder, f),
    }))
    
    // Get top 10 most similar
    const topSimilar = similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10)
      .map(s => s.founderId)
    
    // Get preferred VCs from similar founders
    const preferredVCs = getCollaborativeSignals(topSimilar)
    const topVCs = Array.from(preferredVCs.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([vcId]) => vcId)
    
    // Update cluster
    founderClusters.set(founderId, {
      founderId,
      clusterMembers: topSimilar,
      preferredInvestors: topVCs,
    })
  } catch (error) {
    logger.error('[PREDICTIVE-MATCHING] Cluster update failed:', error)
  }
}

/**
 * Calculate similarity between two founders
 */
function calculateFounderSimilarity(f1: any, f2: any): number {
  let score = 0
  
  // Stage match (30 points)
  if (f1.stage === f2.stage) {
    score += 30
  }
  
  // Sector overlap (30 points)
  try {
    const sectors1 = JSON.parse(f1.sectors || '[]')
    const sectors2 = JSON.parse(f2.sectors || '[]')
    const overlap = sectors1.filter((s: string) => sectors2.includes(s)).length
    score += Math.min(30, overlap * 15)
  } catch {}
  
  // Age proximity (20 points)
  if (f1.age && f2.age) {
    const ageDiff = Math.abs(f1.age - f2.age)
    score += Math.max(0, 20 - ageDiff * 2)
  }
  
  // Location match (10 points)
  if (f1.location === f2.location) {
    score += 10
  }
  
  // Education match (10 points)
  if (f1.education && f2.education && f1.education === f2.education) {
    score += 10
  }
  
  return score
}

/**
 * Get performance report (for monitoring)
 */
export function getPerformanceReport() {
  const performances = Array.from(vcPerformance.values())
    .sort((a, b) => b.qualityScore - a.qualityScore)
  
  return {
    totalVCs: performances.length,
    avgQualityScore: performances.reduce((sum, p) => sum + p.qualityScore, 0) / performances.length,
    topPerformers: performances.slice(0, 10),
    bottomPerformers: performances.slice(-10),
    totalInteractions: interactionHistory.length,
    interactionsByType: {
      views: interactionHistory.filter(i => i.type === InteractionType.VIEW).length,
      bookmarks: interactionHistory.filter(i => i.type === InteractionType.BOOKMARK).length,
      applications: interactionHistory.filter(i => i.type === InteractionType.APPLICATION).length,
      responses: interactionHistory.filter(i => i.type === InteractionType.RESPONSE).length,
      meetings: interactionHistory.filter(i => i.type === InteractionType.MEETING).length,
    },
  }
}
