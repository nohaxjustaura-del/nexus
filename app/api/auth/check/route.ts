import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      const res = NextResponse.json(
        { authenticated: false, verified: false },
        { status: 401 }
      )
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
      return res
    }

    // Ensure manual approval table exists and read status
    let approved = false
    try {
      await (db as any).$executeRawUnsafe?.(`
        CREATE TABLE IF NOT EXISTS UserApproval (
          email TEXT PRIMARY KEY,
          status TEXT NOT NULL DEFAULT 'pending',
          createdAt TEXT NOT NULL,
          reviewedAt TEXT
        );
      `)
      const rows = (await (db as any).$queryRawUnsafe?.(
        `SELECT status FROM UserApproval WHERE email = ? LIMIT 1;`,
        user.email
      )) as any[]
      if (!rows || rows.length === 0) {
        // Insert pending by default
        await (db as any).$executeRawUnsafe?.(
          `INSERT INTO UserApproval (email, status, createdAt) VALUES (?, 'pending', ?)`,
          user.email,
          new Date().toISOString()
        )
      } else {
        approved = rows[0]?.status === 'approved'
      }
    } catch (approvalError) {
      // If approval table cannot be read, default to not approved for safety
      logger.error('AUTH_CHECK', 'Approval check error', approvalError)
      approved = false
    }

    // Treat "verified" as both emailVerified and admin-approved
    const isVerified = user.emailVerified && approved
    
    if (!isVerified) {
      const res = NextResponse.json({
        authenticated: true,
        verified: false, // gate access until both email & approval are complete
        userEmail: user.email, // Include email for auto-repair
        needsApproval: !approved,
        user: {
          id: user.id,
          email: user.email,
          userType: user.userType,
        },
      })
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
      return res
    }
    
    const res = NextResponse.json({
      authenticated: true,
      verified: true,
      userEmail: user.email, // Include email for consistency
      user: {
        id: user.id,
        email: user.email,
        userType: user.userType,
      },
    })
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    return res
  } catch (error) {
    logger.error('AUTH_CHECK', 'Error checking auth', error)
    const res = NextResponse.json(
      { authenticated: false, verified: false },
      { status: 401 }
    )
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    return res
  }
}

