import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Optimize Prisma for SQLite performance
export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn', 'query'] : ['error'],
})

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db

// Add logging wrapper for database operations (only in development)
if (process.env.NODE_ENV === 'development') {
  const originalInvestorFindMany = db.investor.findMany.bind(db.investor)
  // @ts-ignore - Overriding Prisma method for logging
  db.investor.findMany = async function(...args: Parameters<typeof originalInvestorFindMany>) {
    try {
      console.log('[DB] investor.findMany called')
      const result = await originalInvestorFindMany(...args)
      console.log(`[DB] investor.findMany success: ${result.length} results`)
      return result
    } catch (error: unknown) {
      console.error('[DB] investor.findMany error:', error instanceof Error ? error.message : error)
      throw error
    }
  }

  const originalFounderFindUnique = db.founder.findUnique.bind(db.founder)
  // @ts-ignore - Overriding Prisma method for logging
  db.founder.findUnique = async function(...args: Parameters<typeof originalFounderFindUnique>) {
    try {
      console.log('[DB] founder.findUnique called')
      const result = await originalFounderFindUnique(...args)
      console.log(`[DB] founder.findUnique success: ${result ? 'found' : 'not found'}`)
      return result
    } catch (error: unknown) {
      console.error('[DB] founder.findUnique error:', error instanceof Error ? error.message : error)
      throw error
    }
  }
}

// Optimize SQLite connection for better performance (run once on startup)
// Wrapped in try-catch to prevent errors during initialization
try {
  if (typeof window === 'undefined' && process.env.NODE_ENV !== 'production') {
    // Run SQLite optimizations on server-side only
    // These improve read performance significantly
    if (process.env.NODE_ENV === 'development') {
      console.log('[DB] Initializing SQLite optimizations...')
    }
    Promise.all([
      db.$queryRaw`PRAGMA journal_mode = WAL;`.catch((err) => {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[DB] WAL mode failed:', err)
        }
      }),
      db.$queryRaw`PRAGMA synchronous = NORMAL;`.catch((err) => {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[DB] Synchronous mode failed:', err)
        }
      }),
      db.$queryRaw`PRAGMA cache_size = 10000;`.catch((err) => {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[DB] Cache size failed:', err)
        }
      }),
      db.$queryRaw`PRAGMA temp_store = MEMORY;`.catch((err) => {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[DB] Temp store failed:', err)
        }
      }),
    ]).then(() => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[DB] SQLite optimizations applied successfully')
      }
    }).catch((err) => {
      // Silently fail if database isn't ready yet
      if (process.env.NODE_ENV === 'development') {
        console.warn('[DB] SQLite optimizations failed:', err)
      }
    })
  }
} catch (error) {
  // Silently fail - database will work without optimizations
  if (process.env.NODE_ENV === 'development') {
    console.warn('[DB] Database initialization error:', error)
  }
}

