import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Optimize Prisma for SQLite performance
// Only log errors to reduce terminal noise (set DEBUG_DB=true for verbose logging)
export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.DEBUG_DB === 'true' 
    ? ['error', 'warn', 'query'] 
    : ['error'],
})

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db

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

