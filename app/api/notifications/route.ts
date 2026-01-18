import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// GET: Get all notifications for the current user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Determine user type and get founder/investor ID
    const founder = await db.founder.findUnique({
      where: { email: user.email },
    })
    
    const userType = founder ? 'founder' : 'investor'
    const userId = user.id

    // Get notifications - match by userId and userType
    const notifications = await db.notification.findMany({
      where: {
        userId,
        userType,
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to 50 most recent
    })

    const unreadCount = notifications.filter(n => !n.read).length

    return NextResponse.json({
      notifications: notifications.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        read: n.read,
        readAt: n.readAt,
        createdAt: n.createdAt,
        metadata: n.metadata ? JSON.parse(n.metadata) : null,
      })),
      unreadCount,
      total: notifications.length,
    })
  } catch (error: any) {
    logger.error('[NOTIFICATIONS] Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

// POST: Create a new notification (for internal use)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { userId, userType, type, title, message, link, metadata } = await request.json()

    if (!userId || !userType || !type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const notification = await db.notification.create({
      data: {
        userId,
        userType,
        type,
        title,
        message,
        link: link || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    })

    return NextResponse.json({
      notification: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: notification.link,
        read: notification.read,
        createdAt: notification.createdAt,
      },
    })
  } catch (error: any) {
    logger.error('[NOTIFICATIONS] Error creating notification:', error)
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    )
  }
}

// PATCH: Mark notification(s) as read
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { notificationId, markAllAsRead } = await request.json()

    if (markAllAsRead) {
      // Mark all notifications as read for this user
      const founder = await db.founder.findUnique({
        where: { email: user.email },
      })
      
      const userType = founder ? 'founder' : 'investor'
      
      await db.notification.updateMany({
        where: {
          userId: user.id,
          userType,
          read: false,
        },
        data: {
          read: true,
          readAt: new Date(),
        },
      })

      return NextResponse.json({
        message: 'All notifications marked as read',
      })
    }

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      )
    }

    // Mark single notification as read
    const notification = await db.notification.findUnique({
      where: { id: notificationId },
    })

    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      )
    }

    // Verify user owns this notification
    if (notification.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const updated = await db.notification.update({
      where: { id: notificationId },
      data: {
        read: true,
        readAt: new Date(),
      },
    })

    return NextResponse.json({
      notification: {
        id: updated.id,
        read: updated.read,
        readAt: updated.readAt,
      },
    })
  } catch (error: any) {
    logger.error('[NOTIFICATIONS] Error updating notification:', error)
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    )
  }
}

