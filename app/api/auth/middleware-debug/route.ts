import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    const authCookies = request.cookies
      .getAll()
      .filter((c) => c.name.includes('sb-') && c.name.includes('auth'))

    return NextResponse.json({
      supabaseAuthCookies: authCookies.map((c) => ({
        name: c.name,
        valueLength: c.value?.length || 0,
      })),
      prismaUser: user
        ? {
            id: user.id,
            email: user.email,
            emailVerified: user.emailVerified,
          }
        : null,
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
