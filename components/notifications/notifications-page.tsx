'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import {
  FileTextIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  InfoIcon,
  BellIcon,
  CheckCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Notification, NotificationType } from '@prisma/client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shared/page-header'
import {
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/actions/notifications'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types & helpers
// ---------------------------------------------------------------------------

interface NotificationsPageClientProps {
  notifications: Notification[]
  orgId: string
  userId: string
}

type FilterTab = 'all' | 'unread' | 'invoices' | 'payments' | 'system'

const TYPE_ICON: Record<NotificationType, React.ReactNode> = {
  INFO: <InfoIcon className="h-5 w-5 text-gray-500" />,
  SUCCESS: <CheckCircleIcon className="h-5 w-5 text-green-500" />,
  WARNING: <AlertCircleIcon className="h-5 w-5 text-orange-500" />,
  ERROR: <AlertCircleIcon className="h-5 w-5 text-red-500" />,
}

const TYPE_BG: Record<NotificationType, string> = {
  INFO: 'bg-gray-100 dark:bg-gray-800',
  SUCCESS: 'bg-green-50 dark:bg-green-900/20',
  WARNING: 'bg-orange-50 dark:bg-orange-900/20',
  ERROR: 'bg-red-50 dark:bg-red-900/20',
}

function getNotificationCategory(n: Notification): FilterTab {
  const title = n.title.toLowerCase()
  const msg = n.message.toLowerCase()
  if (
    title.includes('invoice') ||
    msg.includes('invoice') ||
    n.link?.includes('/invoices')
  ) {
    return 'invoices'
  }
  if (
    title.includes('payment') ||
    msg.includes('payment') ||
    n.link?.includes('/payments')
  ) {
    return 'payments'
  }
  return 'system'
}

function getNotificationIcon(n: Notification): React.ReactNode {
  const title = n.title.toLowerCase()
  if (title.includes('invoice sent')) {
    return <FileTextIcon className="h-5 w-5 text-blue-500" />
  }
  if (title.includes('payment received') || title.includes('payment recorded')) {
    return <CheckCircleIcon className="h-5 w-5 text-green-500" />
  }
  if (title.includes('overdue') || title.includes('failed') || title.includes('reminder')) {
    return <AlertCircleIcon className="h-5 w-5 text-red-500" />
  }
  return TYPE_ICON[n.type]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NotificationsPageClient({
  notifications: initialNotifications,
  orgId,
  userId,
}: NotificationsPageClientProps) {
  const router = useRouter()
  const [notifications, setNotifications] = React.useState<Notification[]>(initialNotifications)
  const [activeTab, setActiveTab] = React.useState<FilterTab>('all')
  const [markingAll, setMarkingAll] = React.useState(false)

  const unreadCount = notifications.filter((n) => !n.isRead).length

  // ── Filter by tab ────────────────────────────────────────────────────────
  const filtered = React.useMemo(() => {
    if (activeTab === 'all') return notifications
    if (activeTab === 'unread') return notifications.filter((n) => !n.isRead)
    return notifications.filter((n) => getNotificationCategory(n) === activeTab)
  }, [notifications, activeTab])

  // ── Click a notification ─────────────────────────────────────────────────
  async function handleClick(notification: Notification) {
    if (!notification.isRead) {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
      )
      await markNotificationRead(notification.id).catch(() => {})
    }

    if (notification.link) {
      router.push(notification.link)
    }
  }

  // ── Mark all as read ─────────────────────────────────────────────────────
  async function handleMarkAllRead() {
    if (unreadCount === 0) return
    setMarkingAll(true)
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      await markAllNotificationsRead(orgId, userId)
      toast.success('All notifications marked as read')
    } catch {
      toast.error('Failed to mark notifications as read')
    } finally {
      setMarkingAll(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Stay up to date with your invoices, payments, and system alerts."
      >
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={markingAll}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all as read
            <Badge variant="secondary" className="ml-2">
              {unreadCount}
            </Badge>
          </Button>
        )}
      </PageHeader>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FilterTab)}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="all">
            All
            <Badge variant="secondary" className="ml-1.5 h-5 min-w-[20px] px-1.5 text-xs">
              {notifications.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="unread">
            Unread
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-1.5 h-5 min-w-[20px] px-1.5 text-xs">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        {(['all', 'unread', 'invoices', 'payments', 'system'] as FilterTab[]).map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
                <BellIcon className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm font-medium text-muted-foreground">No notifications</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {tab === 'unread'
                    ? 'You are all caught up!'
                    : `No ${tab === 'all' ? '' : tab + ' '}notifications yet.`}
                </p>
              </div>
            ) : (
              <div className="divide-y rounded-lg border">
                {filtered.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleClick(notification)}
                    className={cn(
                      'flex w-full items-start gap-4 p-4 text-left transition-colors hover:bg-accent/50',
                      !notification.isRead && 'bg-blue-50/50 dark:bg-blue-950/20',
                      notification.link && 'cursor-pointer',
                    )}
                  >
                    {/* Icon */}
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                        TYPE_BG[notification.type],
                      )}
                    >
                      {getNotificationIcon(notification)}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            'text-sm',
                            !notification.isRead ? 'font-semibold' : 'font-medium',
                          )}
                        >
                          {notification.title}
                        </p>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {!notification.isRead && (
                      <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
