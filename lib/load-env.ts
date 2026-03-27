/**
 * Load `.env` then `.env.local` for tsx scripts and any code path that imports `db`
 * before Next.js has run (Next injects env on its own). `.env.local` overrides `.env`.
 */
import * as fs from 'fs'
import * as path from 'path'
import { config } from 'dotenv'

let didLoad = false

/** Normalize DATABASE_URL after dotenv (BOM, quotes, `.../postgres&x=` → `.../postgres?x=`). */
export function sanitizeDatabaseUrlFromEnv(): void {
  let u = process.env.DATABASE_URL
  if (u == null || u === '') return

  u = u.replace(/^\uFEFF/, '').trim()
  if ((u.startsWith('"') && u.endsWith('"')) || (u.startsWith("'") && u.endsWith("'"))) {
    u = u.slice(1, -1).trim()
  }
  // Common mistake: /postgres&connection_limit=…  (first query param must use ?)
  u = u.replace(/\/postgres&(?!\/)/i, '/postgres?')

  process.env.DATABASE_URL = u

  if (!/^postgres(ql)?:\/\//i.test(u)) {
    console.error(
      '[load-env] DATABASE_URL must start with postgresql:// — first chars:',
      JSON.stringify(u.slice(0, 36)),
    )
  }
}

export function ensureEnvLoaded(): void {
  if (didLoad) return
  didLoad = true

  const root = process.cwd()
  const envFile = path.join(root, '.env')
  const localFile = path.join(root, '.env.local')
  if (fs.existsSync(envFile)) {
    config({ path: envFile })
  }
  if (fs.existsSync(localFile)) {
    config({ path: localFile, override: true })
  }

  sanitizeDatabaseUrlFromEnv()
}

/** Eager load for worker entrypoints that must set env before other imports (side effect). */
ensureEnvLoaded()
