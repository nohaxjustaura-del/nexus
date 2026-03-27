import { parseJSON } from '@/lib/utils'

/** Minimal founder fields used for thesis matching (same rules as /api/vc/applicants). */
export type ThesisMatchFounderFields = {
  stage: string
  sectors: string
  location: string
  fundingNeed: number
}

/** Minimal investor fields from Prisma `Investor`. */
export type ThesisMatchInvestorFields = {
  stages: string
  sectors: string
  geoFocus: string
  checkMin: number
  checkMax: number
}

export function founderMatchesInvestorThesis(
  founder: ThesisMatchFounderFields,
  investor: ThesisMatchInvestorFields
): boolean {
  const investorStages = parseJSON<string[]>(investor.stages, [])
  const investorSectors = parseJSON<string[]>(investor.sectors, [])
  const investorGeoFocus = parseJSON<string[]>(investor.geoFocus, [])

  const founderStage = founder.stage.toLowerCase()
  const stageMatch = investorStages.some(
    (stage) =>
      founderStage.includes(stage.toLowerCase()) ||
      stage.toLowerCase().includes(founderStage)
  )

  const founderSectors = parseJSON<string[]>(founder.sectors, [])
  const sectorMatch = investorSectors.some((sector) =>
    founderSectors.some(
      (fs) =>
        fs.toLowerCase().includes(sector.toLowerCase()) ||
        sector.toLowerCase().includes(fs.toLowerCase())
    )
  )

  const checkSizeMatch =
    investor.checkMin &&
    investor.checkMax &&
    founder.fundingNeed >= (investor.checkMin || 0) &&
    founder.fundingNeed <= (investor.checkMax || Infinity)

  let geoMatch = true
  if (
    investorGeoFocus.length > 0 &&
    !investorGeoFocus.some((g) => g.toLowerCase().includes('global'))
  ) {
    geoMatch = investorGeoFocus.some(
      (geo) =>
        founder.location?.toLowerCase().includes(geo.toLowerCase()) ||
        geo.toLowerCase().includes(founder.location?.toLowerCase() || '')
    )
  }

  return stageMatch && sectorMatch && Boolean(checkSizeMatch) && geoMatch
}

export function matchScoreForFounderInvestor(
  founder: ThesisMatchFounderFields,
  investor: ThesisMatchInvestorFields
): number {
  const investorSectors = parseJSON<string[]>(investor.sectors, [])
  const founderSectors = parseJSON<string[]>(founder.sectors, [])

  const sectorOverlap = founderSectors.filter((fs) =>
    investorSectors.some(
      (is) =>
        fs.toLowerCase().includes(is.toLowerCase()) ||
        is.toLowerCase().includes(fs.toLowerCase())
    )
  ).length

  const sectorScore =
    investorSectors.length > 0 && founderSectors.length > 0
      ? (sectorOverlap / Math.max(investorSectors.length, founderSectors.length)) * 100
      : 0

  const checkSizeScore =
    investor.checkMin &&
    investor.checkMax &&
    founder.fundingNeed >= (investor.checkMin || 0) &&
    founder.fundingNeed <= (investor.checkMax || Infinity)
      ? 100
      : 50

  return Math.round(sectorScore * 0.6 + checkSizeScore * 0.4)
}
