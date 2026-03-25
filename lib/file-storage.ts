import { createSupabaseAdminClient, getStorageBucketName } from '@/lib/supabase/admin'

/**
 * Sanitize a filename – keep only alphanumerics, dashes, underscores and dots.
 */
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 200)
}

export type UploadOptions = {
  contentType?: string
  /** If false, callers should use signed URLs or server-side download (default: true) */
  publicRead?: boolean
}

/**
 * Upload a file to Supabase Storage. Returns the object path within the bucket
 * (e.g. `videos/founderId/timestamp_file.mp4`). Store this in the database.
 */
export async function saveFileToDisk(
  buffer: Buffer,
  subDir: string,
  founderId: string,
  originalName: string,
  options?: UploadOptions
): Promise<string> {
  const supabase = createSupabaseAdminClient()
  const bucket = getStorageBucketName()
  const timestamp = Date.now()
  const safeName = sanitizeFilename(originalName)
  const objectPath = `${subDir}/${founderId}/${timestamp}_${safeName}`

  const { error } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
    contentType: options?.contentType || 'application/octet-stream',
    upsert: false,
  })

  if (error) {
    throw error
  }

  return objectPath
}

/**
 * Public URL for objects in a public bucket. For private buckets, use signed URLs or server download.
 */
export function getStoragePublicUrl(objectPath: string): string {
  const supabase = createSupabaseAdminClient()
  const bucket = getStorageBucketName()
  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath)
  return data.publicUrl
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
