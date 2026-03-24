import fs from 'fs'
import path from 'path'

const UPLOADS_ROOT = path.join(process.cwd(), 'uploads')

/**
 * Ensure a directory exists, creating it recursively if needed.
 */
function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

/**
 * Sanitize a filename – keep only alphanumerics, dashes, underscores and dots.
 */
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 200)
}

/**
 * Save a file buffer to local disk under the given sub-directory.
 *
 * @param buffer   The file contents
 * @param subDir   Sub-directory inside `uploads/` (e.g. "videos", "pitch-decks")
 * @param founderId  Used to namespace the file
 * @param originalName  Original filename from the upload
 * @returns The relative path from the project root (e.g. "uploads/videos/abc123_1707300000000_pitch.mp4")
 */
export async function saveFileToDisk(
  buffer: Buffer,
  subDir: string,
  founderId: string,
  originalName: string
): Promise<string> {
  const dir = path.join(UPLOADS_ROOT, subDir)
  ensureDir(dir)

  const timestamp = Date.now()
  const safeName = sanitizeFilename(originalName)
  const filename = `${founderId}_${timestamp}_${safeName}`
  const filePath = path.join(dir, filename)

  fs.writeFileSync(filePath, buffer)

  // Return path relative to project root
  return path.join('uploads', subDir, filename).replace(/\\/g, '/')
}

/**
 * Build a founder snapshot object that captures the founder's profile
 * at the time of submission. Useful as training data context.
 */
export function buildFounderSnapshot(founder: any): Record<string, any> {
  return {
    id: founder.id,
    name: founder.name,
    email: founder.email,
    age: founder.age ?? null,
    education: founder.education ?? null,
    gender: founder.gender ?? null,
    bio: founder.bio ?? null,
    startupName: founder.startupName ?? null,
    stage: founder.stage ?? null,
    sectors: founder.sectors ?? null,
    businessModel: founder.businessModel ?? null,
    location: founder.location ?? null,
    fundingNeed: founder.fundingNeed ?? null,
    revenue: founder.revenue ?? null,
    users: founder.users ?? null,
    growthRate: founder.growthRate ?? null,
    teamSize: founder.teamSize ?? null,
    ethicsTags: founder.ethicsTags ?? null,
    valueAddNeeds: founder.valueAddNeeds ?? null,
    profileComplete: founder.profileComplete ?? false,
    willingToDropOut: founder.willingToDropOut ?? false,
  }
}

