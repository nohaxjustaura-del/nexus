/**
 * WORKER STATUS API ENDPOINT
 * 
 * Returns current status of background worker
 */

import { NextResponse } from 'next/server'
import { getWorkerStatus } from '@/lib/background-worker'
import { getCurrentUser } from '@/lib/auth'
import { ADMIN_EMAIL } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Check admin access (optional - remove if you want public access)
    const user = await getCurrentUser(false)
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const status = getWorkerStatus()
    
    return NextResponse.json({
      success: true,
      status,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get worker status' },
      { status: 500 }
    )
  }
}
