import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { isAdminEmail } from '@/lib/constants'
import { getWorkerStatus } from '@/lib/background-worker'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getCurrentUser(false)
    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ success: true, status: getWorkerStatus() })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to get worker status'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
