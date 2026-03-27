// Side effect: loads `.env` / `.env.local` and fixes DATABASE_URL before Prisma reads it.
import "./load-env"
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const rawDatabaseUrl = process.env.DATABASE_URL

/**
 * Supabase: use the **Transaction pooler** URL (port 6543, “Transaction” in dashboard), not Session mode.
 * Session mode → `MaxClientsInSessionMode: max clients reached` when dev + multiple workers connect.
 * Required query param for Prisma + pooler: `pgbouncer=true`
 * @see https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler
 */
function withSafePooling(url?: string) {
  if (!url) return url

  let out = url
  try {
    const u = new URL(url)
    const isSupabasePooler = u.hostname.includes("pooler.supabase.com")
    const effectivePort = u.port || "5432"

    // Session pooler (5432) → very low max clients → MaxClientsInSessionMode under serverless load.
    // Transaction pooler (6543) + pgbouncer=true is the supported Prisma + Supabase setup.
    if (isSupabasePooler && effectivePort === "5432") {
      u.port = "6543"
      u.searchParams.set("pgbouncer", "true")
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "[db] DATABASE_URL used Supabase Session pooler (:5432); switched to Transaction pooler (:6543) + pgbouncer=true. Prefer setting the Transaction URI in env (Supabase → Connect → Transaction pooler).",
        )
      }
    }

    // Transaction pooler (typical port 6543): Prisma needs pgbouncer=true
    if (
      isSupabasePooler &&
      (u.port === "6543" || u.searchParams.get("pgbouncer") === "true")
    ) {
      if (!u.searchParams.has("pgbouncer")) u.searchParams.set("pgbouncer", "true")
    }

    if (!u.searchParams.has("connection_limit")) {
      u.searchParams.set("connection_limit", "1")
    }

    out = u.toString()
  } catch {
    if (!out.includes("connection_limit=")) {
      const sep = out.includes("?") ? "&" : "?"
      out = `${out}${sep}connection_limit=1`
    }
  }

  return out
}

export const db = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: withSafePooling(rawDatabaseUrl),
    },
  },
  log: process.env.DEBUG_DB === 'true'
    ? ['error', 'warn', 'query']
    : ['error'],
})

// Reuse across hot reload (dev) and within the same serverless isolate (prod).
globalForPrisma.prisma = db
