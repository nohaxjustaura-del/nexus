import { db } from './db'

/**
 * Helper function to create a notification for a user
 */
export async function createNotification(params: {
  userId: string
  userType: 'founder' | 'investor'
  type: string
  title: string
  message: string
  link?: string
  metadata?: any
  founderId?: string
  investorId?: string
}) {
  try {
    const notification = await db.notification.create({
      data: {
        userId: params.userId,
        userType: params.userType,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link || null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        founderId: params.founderId || null,
        investorId: params.investorId || null,
      },
    })

    return notification
  } catch (error: any) {
    console.error('[NOTIFICATIONS] Error creating notification:', error)
    return null
  }
}

/**
 * Create notification for new VC matches
 */
export async function notifyNewMatches(founderId: string, matchCount: number) {
  try {
    const founder = await db.founder.findUnique({
      where: { id: founderId },
      select: { id: true },
    })

    if (!founder) return

    // Get user ID from founder
    const user = await db.user.findFirst({
      where: { email: (founder as any).email },
      select: { id: true },
    })

    if (!user) return

    await createNotification({
      userId: user.id,
      userType: 'founder',
      type: 'match',
      title: 'New VC Matches Found!',
      message: `We found ${matchCount} new VC${matchCount !== 1 ? 's' : ''} that match your profile.`,
      link: '/founder/matches',
      metadata: { matchCount },
    })
  } catch (error) {
    console.error('[NOTIFICATIONS] Error creating match notification:', error)
  }
}

/**
 * Create notification for application status updates
 * NOTE: Applications feature has been removed - this function is kept for backwards compatibility
 * but notifications will link to matches instead
 */
export async function notifyApplicationUpdate(
  founderEmail: string,
  investorName: string,
  status: string
) {
  try {
    const user = await db.user.findFirst({
      where: { email: founderEmail },
      select: { id: true },
    })

    if (!user) return

    const statusMessages: Record<string, string> = {
      viewed: 'viewed your application',
      replied: 'replied to your application',
      meeting: 'scheduled a meeting with you',
      approved: 'approved your application!',
      rejected: 'declined your application',
    }

    const message = statusMessages[status] || 'updated your application status'

    await createNotification({
      userId: user.id,
      userType: 'founder',
      type: 'application_response',
      title: `${investorName} ${message}`,
      message: `Your application status has been updated to: ${status}`,
      link: '/founder/matches', // Changed from /founder/applications to /founder/matches
      metadata: { status, investorName },
    })
  } catch (error) {
    console.error('[NOTIFICATIONS] Error creating application notification:', error)
  }
}

