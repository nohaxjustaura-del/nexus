import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

function parseJSONArray(val: string | null): string[] {
  if (!val) return []
  try {
    const parsed = JSON.parse(val)
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : []
  } catch {
    return []
  }
}

export async function GET() {
  try {
    const investors = await db.investor.findMany({
      where: { isPublic: true },
      select: {
        sectors: true,
        stages: true,
        geoFocus: true,
        geography: true,
        checkMin: true,
        checkMax: true,
        checkSizeMin: true,
        checkSizeMax: true,
        fundType: true,
      },
    })

    const sectorCounts: Record<string, number> = {}
    const stageCounts: Record<string, number> = {}
    const geoCounts: Record<string, number> = {}
    const fundTypeCounts: Record<string, number> = {}

    const stageCheckSizes: Record<string, { total: number; count: number }> = {}

    for (const inv of investors) {
      const sectors = parseJSONArray(inv.sectors)
      for (const s of sectors) {
        const norm = s.trim()
        if (norm) sectorCounts[norm] = (sectorCounts[norm] || 0) + 1
      }

      const stages = parseJSONArray(inv.stages)
      for (const s of stages) {
        const norm = s.trim()
        if (norm) {
          stageCounts[norm] = (stageCounts[norm] || 0) + 1
          const avg = ((inv.checkSizeMin || inv.checkMin || 0) + (inv.checkSizeMax || inv.checkMax || 0)) / 2
          if (avg > 0) {
            if (!stageCheckSizes[norm]) stageCheckSizes[norm] = { total: 0, count: 0 }
            stageCheckSizes[norm].total += avg
            stageCheckSizes[norm].count += 1
          }
        }
      }

      const geo = parseJSONArray(inv.geoFocus || inv.geography)
      for (const g of geo) {
        const norm = g.trim()
        if (norm) geoCounts[norm] = (geoCounts[norm] || 0) + 1
      }

      if (inv.fundType) {
        fundTypeCounts[inv.fundType] = (fundTypeCounts[inv.fundType] || 0) + 1
      }
    }

    const sortByCount = (obj: Record<string, number>, limit = 15) =>
      Object.entries(obj)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([name, count]) => ({ name, count }))

    const avgCheckByStage = Object.entries(stageCheckSizes)
      .map(([stage, { total, count }]) => ({
        stage,
        avgCheck: Math.round(total / count),
        investorCount: stageCounts[stage] || 0,
      }))
      .sort((a, b) => b.investorCount - a.investorCount)

    return NextResponse.json({
      totalInvestors: investors.length,
      topSectors: sortByCount(sectorCounts),
      topStages: sortByCount(stageCounts, 10),
      topGeographies: sortByCount(geoCounts),
      fundTypes: sortByCount(fundTypeCounts, 10),
      avgCheckByStage,
    })
  } catch (error) {
    console.error('[MARKET-INTELLIGENCE] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
