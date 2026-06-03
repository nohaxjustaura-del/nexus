import type { User as PrismaUser } from '@prisma/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { syncPrismaUserFromAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const DEFAULT_TEST_SUPER_LOGIN = 'test12345'
export const DEFAULT_TEST_SUPER_EMAIL = 'test12345@nexus.test'

const TEST_SUPER_CREDITS = 1_000_000

export function isTestSuperAccountEnabled(): boolean {
  const explicit = (process.env.ENABLE_TEST_SUPER_ACCOUNT ?? '').trim().toLowerCase()
  if (explicit === 'true') return true
  if (explicit === 'false') return false
  // Default on in local dev so `test12345` works without extra env setup.
  return process.env.NODE_ENV === 'development'
}

export function getTestSuperAccountLogin(): string {
  return (process.env.TEST_SUPER_ACCOUNT_LOGIN || DEFAULT_TEST_SUPER_LOGIN).toLowerCase().trim()
}

export function getTestSuperAccountEmail(): string {
  return (process.env.TEST_SUPER_ACCOUNT_EMAIL || DEFAULT_TEST_SUPER_EMAIL).toLowerCase().trim()
}

export function isTestSuperAccountIdentifier(raw: string | null | undefined): boolean {
  if (!raw || !isTestSuperAccountEnabled()) return false
  const value = raw.toLowerCase().trim()
  return value === getTestSuperAccountLogin() || value === getTestSuperAccountEmail()
}

export function isTestSuperAccountEmail(email: string | null | undefined): boolean {
  if (!email || !isTestSuperAccountEnabled()) return false
  return email.toLowerCase().trim() === getTestSuperAccountEmail()
}

export async function ensureTestSuperAccountProvisioned(): Promise<PrismaUser> {
  const email = getTestSuperAccountEmail()

  let user = await db.user.findUnique({ where: { email } })
  if (!user) {
    user = await db.user.create({
      data: {
        email,
        emailVerified: true,
        userType: 'founder',
        onboardingCompleted: true,
      },
    })
  } else if (!user.emailVerified || !user.onboardingCompleted) {
    user = await db.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        onboardingCompleted: true,
      },
    })
  }

  await db.userApproval.upsert({
    where: { email },
    create: {
      email,
      status: 'approved',
      reviewedAt: new Date(),
    },
    update: {
      status: 'approved',
      reviewedAt: new Date(),
    },
  })

  await db.userCredits.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      credits: TEST_SUPER_CREDITS,
      isPremium: true,
      purchases: '[]',
    },
    update: {
      credits: TEST_SUPER_CREDITS,
      isPremium: true,
    },
  })

  const founder = await db.founder.findUnique({ where: { email } })
  if (!founder) {
    await db.founder.create({
      data: {
        email,
        name: 'Nexus Test Account',
        stage: 'idea',
        sectors: JSON.stringify(['SaaS']),
        location: 'San Francisco, CA',
        countryCode: 'US',
        regionCode: 'CA',
        fundingNeed: 500_000,
        ethicsTags: JSON.stringify([]),
        personalityTags: JSON.stringify([]),
        valueAddNeeds: JSON.stringify([]),
      },
    })
  }

  return user
}

async function ensureSupabaseTestUser(adminClient: ReturnType<typeof createSupabaseAdminClient>) {
  const email = getTestSuperAccountEmail()
  const created = await adminClient.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { user_type: 'founder' },
  })

  if (created.error) {
    const message = created.error.message.toLowerCase()
    const alreadyExists =
      message.includes('already') ||
      message.includes('registered') ||
      message.includes('exists')
    if (!alreadyExists) {
      throw created.error
    }
  }
}

export async function signInTestSuperAccount(
  request: NextRequest,
  supabase: SupabaseClient,
  applyAuthCookies: (response: NextResponse) => void
): Promise<NextResponse> {
  if (!isTestSuperAccountEnabled()) {
    return NextResponse.json({ error: 'Test super account login is disabled' }, { status: 404 })
  }

  try {
    const adminClient = createSupabaseAdminClient()
    await ensureSupabaseTestUser(adminClient)

    const email = getTestSuperAccountEmail()
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })

    const tokenHash = linkData?.properties?.hashed_token
    if (linkError || typeof tokenHash !== 'string') {
      console.error('Test super account generateLink error:', linkError)
      return NextResponse.json({ error: 'Failed to create test sign-in session' }, { status: 500 })
    }

    const otpTypes = ['email', 'magiclink'] as const
    let verified = false
    for (const type of otpTypes) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      })
      if (!error) {
        verified = true
        break
      }
    }

    if (!verified) {
      return NextResponse.json({ error: 'Failed to verify test sign-in session' }, { status: 500 })
    }

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Failed to establish test session' }, { status: 500 })
    }

    await syncPrismaUserFromAuth(authUser)
    const user = await ensureTestSuperAccountProvisioned()

    const res = NextResponse.json({
      success: true,
      adminBypass: true,
      testSuperAccount: true,
      message: 'Signed in with the test super account.',
      user: {
        id: user.id,
        email: user.email,
        userType: user.userType,
      },
    })
    applyAuthCookies(res)
    return res
  } catch (error) {
    console.error('Test super account login error:', error)
    return NextResponse.json({ error: 'Failed to sign in test account' }, { status: 500 })
  }
}
