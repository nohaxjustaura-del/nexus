import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const rawDatabaseUrl = process.env.DATABASE_URL

function withSafePooling(url?: string) {
  if (!url) return url
  if (url.includes("connection_limit=")) return url

  const separator = url.includes("?") ? "&" : "?"
  // Keep Prisma's internal pool tiny for Supabase session pooler/serverless environments.
  return `${url}${separator}connection_limit=1`
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

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db
