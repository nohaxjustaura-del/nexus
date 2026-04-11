/**
 * Systematic coverage tracker for VC discovery.
 *
 * Maintains a grid of (sector, region, stage) cells, each with a timestamp
 * and hit count. The discovery engine calls `getLeastCoveredCombinations(n)`
 * to pick the N cells with oldest/no coverage, ensuring every niche gets
 * searched before any niche is searched twice.
 *
 * State persists to `data/discovery-coverage.json`.
 */

import * as fs from 'fs'
import * as path from 'path'
import { DISCOVERY_SECTORS, DISCOVERY_REGIONS, DISCOVERY_STAGES } from './vc-discovery-from-web'

const COVERAGE_FILE = path.join(process.cwd(), 'data', 'discovery-coverage.json')

export type CoverageCell = {
  sector: string
  region: string
  stage: string
  lastSearchedAt: string | null
  candidatesFound: number
  totalSearches: number
}

type CoverageState = {
  cells: Record<string, CoverageCell>
  lastUpdated: string
}

function cellKey(sector: string, region: string, stage: string): string {
  return `${sector}|${region}|${stage}`
}

function ensureDataDir(): void {
  const dir = path.dirname(COVERAGE_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function buildEmptyState(): CoverageState {
  const cells: Record<string, CoverageCell> = {}
  for (const sector of DISCOVERY_SECTORS) {
    for (const region of DISCOVERY_REGIONS) {
      for (const stage of DISCOVERY_STAGES) {
        const k = cellKey(sector, region, stage)
        cells[k] = {
          sector,
          region,
          stage,
          lastSearchedAt: null,
          candidatesFound: 0,
          totalSearches: 0,
        }
      }
    }
  }
  return { cells, lastUpdated: new Date().toISOString() }
}

export function loadCoverage(): CoverageState {
  try {
    if (fs.existsSync(COVERAGE_FILE)) {
      const raw = fs.readFileSync(COVERAGE_FILE, 'utf8')
      const parsed = JSON.parse(raw) as CoverageState
      // Merge in any new cells (if SECTORS/REGIONS/STAGES expanded)
      const fresh = buildEmptyState()
      for (const k of Object.keys(fresh.cells)) {
        if (!parsed.cells[k]) parsed.cells[k] = fresh.cells[k]
      }
      return parsed
    }
  } catch {
    // corrupted file — rebuild
  }
  return buildEmptyState()
}

export function saveCoverage(state: CoverageState): void {
  ensureDataDir()
  state.lastUpdated = new Date().toISOString()
  fs.writeFileSync(COVERAGE_FILE, JSON.stringify(state, null, 2), 'utf8')
}

/**
 * Returns the N (sector, region, stage) combinations with the oldest or
 * no coverage, sorted by least-recently-searched first.
 */
export function getLeastCoveredCombinations(
  n: number,
): Array<{ sector: string; region: string; stage: string }> {
  const state = loadCoverage()
  const cells = Object.values(state.cells)

  cells.sort((a, b) => {
    // Never-searched cells first
    if (!a.lastSearchedAt && b.lastSearchedAt) return -1
    if (a.lastSearchedAt && !b.lastSearchedAt) return 1
    if (!a.lastSearchedAt && !b.lastSearchedAt) {
      // Break ties with fewer total searches first
      return a.totalSearches - b.totalSearches
    }
    // Both have timestamps — oldest first
    const ta = new Date(a.lastSearchedAt!).getTime()
    const tb = new Date(b.lastSearchedAt!).getTime()
    if (ta !== tb) return ta - tb
    return a.totalSearches - b.totalSearches
  })

  return cells.slice(0, Math.max(1, n)).map((c) => ({
    sector: c.sector,
    region: c.region,
    stage: c.stage,
  }))
}

/**
 * Record that a discovery search was performed for the given combination.
 */
export function recordSearch(
  sector: string,
  region: string,
  stage: string,
  candidatesFound: number,
): void {
  const state = loadCoverage()
  const k = cellKey(sector, region, stage)
  if (!state.cells[k]) {
    state.cells[k] = {
      sector,
      region,
      stage,
      lastSearchedAt: null,
      candidatesFound: 0,
      totalSearches: 0,
    }
  }
  state.cells[k].lastSearchedAt = new Date().toISOString()
  state.cells[k].candidatesFound += candidatesFound
  state.cells[k].totalSearches += 1
  saveCoverage(state)
}

/** Summary stats for admin dashboard. */
export function getCoverageStats(): {
  totalCells: number
  coveredCells: number
  uncoveredCells: number
  totalCandidatesFound: number
  totalSearches: number
  topUncoveredSectors: string[]
  topUncoveredRegions: string[]
} {
  const state = loadCoverage()
  const cells = Object.values(state.cells)
  const covered = cells.filter((c) => c.lastSearchedAt !== null)
  const uncovered = cells.filter((c) => c.lastSearchedAt === null)

  const sectorCounts = new Map<string, number>()
  const regionCounts = new Map<string, number>()
  for (const c of uncovered) {
    sectorCounts.set(c.sector, (sectorCounts.get(c.sector) ?? 0) + 1)
    regionCounts.set(c.region, (regionCounts.get(c.region) ?? 0) + 1)
  }

  const topUncoveredSectors = [...sectorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([s]) => s)

  const topUncoveredRegions = [...regionCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([r]) => r)

  return {
    totalCells: cells.length,
    coveredCells: covered.length,
    uncoveredCells: uncovered.length,
    totalCandidatesFound: cells.reduce((s, c) => s + c.candidatesFound, 0),
    totalSearches: cells.reduce((s, c) => s + c.totalSearches, 0),
    topUncoveredSectors,
    topUncoveredRegions,
  }
}
