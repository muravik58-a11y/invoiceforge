'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import type { Notification, NotificationType } from '@prisma/client'

// ---------------------------------------------------------------------------
// getNotifications
// ---------------------------------------------------------------------------

/**
 * Fetch notifications for an organisation/user combination.
 *
 * @param orgId      - The InvoiceForge organisation ID
 * @param userId     - The Clerk user ID
 * @param unreadOnly - When true, only return unread notifications
 */
export async function getNotifications(
  orgId: string,
  userId: string,
  unreadOnly?: boolean,
): Promise<Notification[]> {
  if (!orgId) throw new Error('orgId is required')

  try {
    const notifications = await prisma.notification.findMany({
      where: {
        organizationId: orgId,
        // Return org-wide (userId=null) OR user-specific notifications
        OR: [{ userId: null }, { userId }],
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return notifications
  } catch (error) {
    console.error('[getNotifications]', error)
    throw new Error('Failed to fetch notifications')
  }
}

// ---------------------------------------------------------------------------
// markNotificationRead
// ---------------------------------------------------------------------------

/**
 * Mark a single notification as read.
 *
 * @param notificationId - The notification Prisma ID
 */
export async function markNotificationRead(notificationId: string): Promise<void> {
  if (!notificationId) throw new Error('notificationId is required')

  try {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    })

    revalidatePath('/notifications')
  } catch (error) {
    console.error('[markNotificationRead]', error)
    throw new Error('Failed to mark notification as read')
  }
}

// ---------------------------------------------------------------------------
// markAllNotificationsRead
// ---------------------------------------------------------------------------

/**
 * Mark all notifications for an organisation/user as read.
 *
 * @param orgId  - The InvoiceForge organisation ID
 * @param userId - The Clerk user ID
 */
export async function markAllNotificationsRead(
  orgId: string,
  userId: string,
): Promise<void> {
  if (!orgId) throw new Error('orgId is required')

  try {
    await prisma.notification.updateMany({
      where: {
        organizationId: orgId,
        OR: [{ userId: null }, { userId }],
        isRead: false,
      },
      data: { isRead: true },
    })

    revalidatePath('/notifications')
  } catch (error) {
    console.error('[markAllNotificationsRead]', error)
    throw new Error('Failed to mark all notifications as read')
  }
}

// ---------------------------------------------------------------------------
// createNotification
// ---------------------------------------------------------------------------

/**
 * Create a new notification record.
 */
export async function createNotification(data: {
  organizationId: string
  userId?: string
  title: string
  message: string
  type: NotificationType
  link?: string
}): Promise<Notification> {
  if (!data.organizationId) throw new Error('organizationId is required')
  if (!data.title) throw new Error('title is required')
  if (!data.message) throw new Error('message is required')

  try {
    const notification = await prisma.notification.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId ?? null,
        title: data.title,
        message: data.message,
        type: data.type,
        link: data.link ?? null,
      },
    })

    revalidatePath('/notifications')
    return notification
  } catch (error) {
    console.error('[createNotification]', error)
    throw new Error('Failed to create notification')
  }
}

// ---------------------------------------------------------------------------
// getUnreadCount
// ---------------------------------------------------------------------------

/**
 * Return the count of unread notifications for an organisation/user.
 *
 * @param orgId  - The InvoiceForge organisation ID
 * @param userId - The Clerk user ID
 */
export async function getUnreadCount(orgId: string, userId: string): Promise<number> {
  if (!orgId) throw new Error('orgId is required')

  try {
    const count = await prisma.notification.count({
      where: {
        organizationId: orgId,
        OR: [{ userId: null }, { userId }],
        isRead: false,
      },
    })

    return count
  } catch (error) {
    console.error('[getUnreadCount]', error)
    return 0
  }
}
