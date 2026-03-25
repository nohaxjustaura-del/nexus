import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const all = cookieStore.getAll()
    const hasSupabaseAuthCookie = all.some(
      (c) => c.name.includes('sb-') && c.name.includes('auth')
    )
    const user = await getCurrentUser(false)

    return NextResponse.json({
      hasCookie: hasSupabaseAuthCookie,
      hasUser: !!user,
      userEmail: user?.email || null,
      userVerified: user?.emailVerified || false,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
