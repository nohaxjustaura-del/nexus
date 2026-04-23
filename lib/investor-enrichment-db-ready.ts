import type { PrismaClient } from '@prisma/client'

/**
 * Ensures investor enrichment migration has been applied (columns + portfolio table).
 * Call before any Prisma query that selects Investor.foundedYear / portfolioCompanies.
 */
export async function assertInvestorEnrichmentMigrated(db: PrismaClient): Promise<void> {
  const rows = await db.$queryRaw<Array<{ col_ok: boolean; table_ok: boolean }>>`
    SELECT
      EXISTS (
        SELECT 1
        FROM information_schema.columns c
        WHERE c.table_schema = current_schema()
          AND c.table_name = 'Investor'
          AND c.column_name = 'foundedYear'
      ) AS "col_ok",
      EXISTS (
        SELECT 1
        FROM information_schema.tables t
        WHERE t.table_schema = current_schema()
          AND t.table_name = 'InvestorPortfolioCompany'
      ) AS "table_ok"
  `
  const row = rows[0]
  if (row?.col_ok === true && row?.table_ok === true) return

  throw new Error(
    'Investor enrichment schema is missing in this database (e.g. Investor.foundedYear or InvestorPortfolioCompany).\n' +
      'Apply migrations from the repo root, using a direct Postgres URL if the pooler hangs:\n' +
      '  npx prisma migrate deploy\n' +
      'Supabase: set DIRECT_DATABASE_URL to the session pooler (:5432) — see prisma/schema.prisma datasource comments.',
  )
}
