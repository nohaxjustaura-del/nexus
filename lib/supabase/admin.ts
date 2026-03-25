import { createClient } from '@supabase/supabase-js'

export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export function getStorageBucketName(): string {
  return process.env.SUPABASE_STORAGE_BUCKET || 'uploads'
}

export async function downloadStorageObject(objectPath: string): Promise<{
  buffer: Buffer
  contentType: string | null
}> {
  const supabase = createSupabaseAdminClient()
  const bucket = getStorageBucketName()
  const { data, error } = await supabase.storage.from(bucket).download(objectPath)
  if (error) {
    throw error
  }
  const buf = Buffer.from(await data.arrayBuffer())
  const contentType = data.type || null
  return { buffer: buf, contentType }
}
