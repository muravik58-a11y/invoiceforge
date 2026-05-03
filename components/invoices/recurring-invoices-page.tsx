'use client'
import { Prisma } from '@prisma/client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  PlusIcon,
  RefreshCwIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  Trash2Icon,
  CalendarIcon,
  RepeatIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { PageHeader } from '@/components/shared/page-header'
import { formatCurrency, formatDate } from '@/lib/utils'
import { RECURRING_FREQUENCY_LABELS } from '@/lib/constants'
import type { RecurringFrequency } from '@prisma/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecurringClient {
  id: string
  companyName: string
  email: string | null
}

interface RecurringChild {
  id: string
  invoiceNumber: string
  issueDate: Date
  total: Prisma.Decimal | number
  status: string
}

interface RecurringInvoiceItem {
  id: string
  clientId: string
  frequency: RecurringFrequency
  nextIssueDate: Date
  lastIssuedDate: Date | null
  isActive: boolean
  templateData: any
  client: RecurringClient
  invoices: RecurringChild[]
}

interface RecurringInvoicesPageProps {
  recurringInvoices: RecurringInvoiceItem[]
  orgId: string
}

function toNum(v: Prisma.Decimal | number | string | null | undefined): number {
  if (v == null) return 0
  if (typeof v === 'number') return v
  return parseFloat(v.toString())
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RecurringInvoicesPage({
  recurringInvoices,
  orgId,
}: RecurringInvoicesPageProps) {
  const router = useRouter()

  if (recurringInvoices.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Recurring Invoices"
          description="Automate regular invoices for retainer clients and subscriptions."
        >
          <Button size="sm" onClick={() => toast.info('Create recurring invoice — coming soon')}>
            <PlusIcon className="mr-1.5 size-4" />
            Set Up Recurring
          </Button>
        </PageHeader>

        <div className="rounded-xl border border-dashed bg-muted/20 p-12 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
            <RepeatIcon className="size-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No recurring invoices</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            Set up recurring invoices to automatically generate invoices for your retainer
            clients on a weekly, monthly, quarterly or annual basis.
          </p>
          <Button
            className="mt-6"
            onClick={() => toast.info('Create recurring invoice — coming soon')}
          >
            <PlusIcon className="mr-1.5 size-4" />
            Create Your First Recurring Invoice
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recurring Invoices"
        description="Automate regular invoices for retainer clients and subscriptions."
      >
        <Button size="sm" onClick={() => toast.info('Create recurring invoice — coming soon')}>
          <PlusIcon className="mr-1.5 size-4" />
          Set Up Recurring
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: 'Active Schedules',
            value: recurringInvoices.filter((r) => r.isActive).length,
          },
          {
            label: 'Paused',
            value: recurringInvoices.filter((r) => !r.isActive).length,
          },
          {
            label: 'Due This Month',
            value: recurringInvoices.filter((r) => {
              const next = new Date(r.nextIssueDate)
              const now = new Date()
              return (
                r.isActive &&
                next.getFullYear() === now.getFullYear() &&
                next.getMonth() === now.getMonth()
              )
            }).length,
          },
          {
            label: 'Total Schedules',
            value: recurringInvoices.length,
          },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recurring invoice cards */}
      <div className="space-y-4">
        {recurringInvoices.map((rec) => {
          const templateData = rec.templateData as {
            items?: Array<{ description: string; quantity: number; unitPrice: number }>
            notes?: string
          } | null

          const estimatedTotal =
            templateData?.items?.reduce(
              (sum, it) => sum + (it.quantity || 0) * (it.unitPrice || 0),
              0,
            ) ?? 0

          return (
            <div
              key={rec.id}
              className="rounded-xl border bg-card overflow-hidden"
            >
              <div className="flex items-start justify-between p-5">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <RepeatIcon className="size-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{rec.client.companyName}</h3>
                      <Badge
                        variant="outline"
                        className={
                          rec.isActive
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-gray-50 text-gray-500 border-gray-200'
                        }
                      >
                        {rec.isActive ? 'Active' : 'Paused'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {rec.client.email}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <RefreshCwIcon className="size-3" />
                        {RECURRING_FREQUENCY_LABELS[rec.frequency] ?? rec.frequency}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="size-3" />
                        Next:{' '}
                        <strong className="text-foreground ml-0.5">
                          {formatDate(rec.nextIssueDate)}
                        </strong>
                      </span>
                      {rec.lastIssuedDate && (
                        <span>
                          Last issued: {formatDate(rec.lastIssuedDate)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="hidden text-right sm:block">
                    <p className="text-xs text-muted-foreground">Est. per invoice</p>
                    <p className="font-semibold">
                      {formatCurrency(estimatedTotal)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        toast.info(
                          `${rec.isActive ? 'Pause' : 'Resume'} recurring — coming soon`,
                        )
                      }
                    >
                      {rec.isActive ? (
                        <PauseCircleIcon className="size-4" />
                      ) : (
                        <PlayCircleIcon className="size-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() =>
                        toast.info('Delete recurring schedule — coming soon')
                      }
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Recent invoices from this schedule */}
              {rec.invoices && rec.invoices.length > 0 && (
                <>
                  <Separator />
                  <div className="px-5 py-3 bg-muted/20">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Recent Invoices
                    </p>
                    <div className="space-y-1">
                      {rec.invoices.map((inv) => (
                        <div
                          key={inv.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <button
                            className="font-mono text-primary hover:underline"
                            onClick={() => router.push(`/invoices/${inv.id}`)}
                          >
                            {inv.invoiceNumber}
                          </button>
                          <span className="text-muted-foreground">
                            {format(new Date(inv.issueDate), 'dd MMM yyyy')}
                          </span>
                          <span className="font-medium tabular-nums">
                            {formatCurrency(toNum(inv.total))}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-xs capitalize"
                          >
                            {inv.status.toLowerCase()}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
