'use client'

import Link from 'next/link'
import {
  PoundSterling,
  Clock,
  AlertTriangle,
  FileText,
  Users,
  Package,
  BarChart3,
  Plus,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import type { Organization } from '@prisma/client'
import type { DashboardStats, MonthlyRevenue } from '@/types'
import { INVOICE_STATUSES } from '@/lib/constants'
import { cn, formatCurrency, formatDate } from '@/lib/utils'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import { StatsCard } from '@/components/dashboard/stats-card'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { InvoiceStatusChart, type StatusBreakdown } from '@/components/dashboard/invoice-status-chart'

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

// ─────────────────────────────────────────────
// Status badge
// ─────────────────────────────────────────────

function InvoiceStatusBadge({ status }: { status: string }) {
  const meta = INVOICE_STATUSES[status as keyof typeof INVOICE_STATUSES]
  if (!meta) return <Badge variant="outline">{status}</Badge>

  const colorClass = cn(
    'inline-flex h-5 items-center rounded-full px-2 py-0.5 text-[11px] font-medium border',
    meta.color,
    meta.textColor,
    meta.borderColor,
  )

  return <span className={colorClass}>{meta.label}</span>
}

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface DashboardPageProps {
  stats: DashboardStats
  org: Organization
  monthlyRevenue: MonthlyRevenue[]
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

export function DashboardPage({ stats, org, monthlyRevenue }: DashboardPageProps) {
  const revenueTrend = percentChange(stats.revenueThisMonth, stats.revenueLastMonth)

  // Outstanding count = total this month minus paid, overdue, and draft
  const sentCount = Math.max(
    0,
    stats.totalInvoices - stats.paidInvoices - stats.overdueInvoices - stats.draftInvoices,
  )

  // Status breakdown for donut chart
  const statusBreakdown: StatusBreakdown[] = [
    { status: 'PAID',    count: stats.paidInvoices },
    { status: 'SENT',    count: sentCount },
    { status: 'OVERDUE', count: stats.overdueInvoices },
    { status: 'DRAFT',   count: stats.draftInvoices },
  ]

  const displayName = org.companyName ?? org.name

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome back{displayName ? `, ${displayName}` : ''}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening with your invoices today.
          </p>
        </div>

        {/* Quick-action: create invoice CTA in header for fast access */}
        <Button
          className="hidden sm:flex shrink-0"
          nativeButton={false} render={<Link href="/invoices/new" />}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          New Invoice
        </Button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 1 — Stats cards
      ══════════════════════════════════════════════════════════════════ */}
      <section aria-label="Summary statistics">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {/* Revenue this month */}
          <StatsCard
            title="Revenue This Month"
            value={formatCurrency(stats.revenueThisMonth)}
            description={
              <span>
                {formatCurrency(stats.revenueLastMonth)}{' '}
                <span className="text-muted-foreground/70">last month</span>
              </span>
            }
            trend={revenueTrend}
            trendLabel="vs last month"
            icon={<PoundSterling className="h-4 w-4" />}
            variant="success"
          />

          {/* Outstanding */}
          <StatsCard
            title="Outstanding"
            value={formatCurrency(stats.outstandingAmount)}
            description={
              <span className="flex items-center gap-1">
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                  {sentCount} sent
                </Badge>
                <span className="text-muted-foreground/70">awaiting payment</span>
              </span>
            }
            icon={<Clock className="h-4 w-4" />}
            variant="default"
          />

          {/* Overdue */}
          <StatsCard
            title="Overdue"
            value={formatCurrency(stats.overdueAmount)}
            description={
              <span className="flex items-center gap-1">
                <Badge variant="destructive" className="px-1.5 py-0 text-[10px]">
                  {stats.overdueInvoices} overdue
                </Badge>
                <span className="text-muted-foreground/70">need attention</span>
              </span>
            }
            icon={<AlertTriangle className="h-4 w-4" />}
            variant={stats.overdueAmount > 0 ? 'danger' : 'default'}
          />

          {/* Total invoices this month */}
          <StatsCard
            title="Invoices This Month"
            value={String(stats.totalInvoices)}
            description={
              <span className="flex flex-wrap items-center gap-1">
                <span className="text-green-600 dark:text-green-400 font-medium">
                  {stats.paidInvoices} paid
                </span>
                <span className="text-muted-foreground/50">·</span>
                <span className="text-muted-foreground">
                  {stats.draftInvoices} draft
                </span>
              </span>
            }
            icon={<FileText className="h-4 w-4" />}
            variant="default"
          />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 2 — Charts
      ══════════════════════════════════════════════════════════════════ */}
      <section aria-label="Charts" className="grid gap-4 lg:grid-cols-5">
        {/* Revenue area chart (wider) */}
        <Card className="lg:col-span-3">
          <CardHeader className="border-b border-border pb-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-semibold">Revenue Overview</CardTitle>
                <CardDescription className="mt-0.5">
                  Last 6 months — paid vs outstanding
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground -mt-0.5 -mr-1"
                nativeButton={false} render={<Link href="/reports" />}
              >
                Full report
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <RevenueChart data={monthlyRevenue.slice(-6)} />
          </CardContent>
        </Card>

        {/* Invoice status donut (narrower) */}
        <Card className="lg:col-span-2">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="text-sm font-semibold">Invoice Status</CardTitle>
            <CardDescription className="mt-0.5">
              Breakdown across all invoices
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <InvoiceStatusChart
              data={statusBreakdown}
              total={stats.totalInvoices}
            />
          </CardContent>
        </Card>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 3 — Recent invoices + Top clients
      ══════════════════════════════════════════════════════════════════ */}
      <section aria-label="Details" className="grid gap-4 lg:grid-cols-5">
        {/* ── Recent invoices ────────────────────────────────────────────── */}
        <Card className="lg:col-span-3">
          <CardHeader className="border-b border-border pb-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-semibold">Recent Invoices</CardTitle>
                <CardDescription className="mt-0.5">Latest 10 invoices</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground -mt-0.5 -mr-1 shrink-0"
                nativeButton={false} render={<Link href="/invoices" />}
              >
                View all
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-0 px-0">
            {stats.recentInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center px-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">No invoices yet</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Create your first invoice to get started.
                  </p>
                </div>
                <Button
                  size="sm"
                  nativeButton={false} render={<Link href="/invoices/new" />}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Create Invoice
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {stats.recentInvoices.map((invoice) => (
                  <Link
                    key={invoice.id}
                    href={`/invoices/${invoice.id}`}
                    className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    {/* Invoice number + client */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-medium text-foreground truncate">
                          {invoice.invoiceNumber}
                        </span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 shrink-0" />
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground truncate">
                        {invoice.clientName}
                      </p>
                    </div>

                    {/* Due date */}
                    <div className="hidden sm:block shrink-0 text-right">
                      <p className="text-xs text-muted-foreground">
                        Due {formatDate(invoice.dueDate)}
                      </p>
                    </div>

                    {/* Status */}
                    <div className="shrink-0">
                      <InvoiceStatusBadge status={invoice.status} />
                    </div>

                    {/* Amount */}
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums text-foreground">
                        {formatCurrency(invoice.total)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Top clients ────────────────────────────────────────────────── */}
        <Card className="lg:col-span-2">
          <CardHeader className="border-b border-border pb-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-semibold">Top Clients</CardTitle>
                <CardDescription className="mt-0.5">By total paid revenue</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground -mt-0.5 -mr-1 shrink-0"
                nativeButton={false} render={<Link href="/clients" />}
              >
                View all
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-0 px-0">
            {stats.topClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center px-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">No clients yet</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Add your first client to see revenue data.
                  </p>
                </div>
                <Button
                  size="sm"
                  nativeButton={false} render={<Link href="/clients/new" />}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add Client
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {stats.topClients.map((client, idx) => {
                  const initials = getInitials(client.companyName)
                  // Deterministic avatar colour based on index
                  const avatarColors = [
                    'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
                    'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
                    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
                    'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
                    'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
                  ]
                  const avatarColor = avatarColors[idx % avatarColors.length]

                  // Revenue bar — width proportional to top client
                  const topRevenue = stats.topClients[0]?.totalRevenue ?? 1
                  const barWidth = topRevenue > 0
                    ? Math.round((client.totalRevenue / topRevenue) * 100)
                    : 0

                  return (
                    <Link
                      key={client.id}
                      href={`/clients/${client.id}`}
                      className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                    >
                      {/* Rank + avatar */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="shrink-0 text-xs text-muted-foreground w-4 text-center font-mono">
                          {idx + 1}
                        </span>
                        <div
                          className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                            avatarColor,
                          )}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {client.companyName}
                          </p>
                          {/* Mini revenue bar */}
                          <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-500 transition-all"
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Revenue + invoice count */}
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold tabular-nums text-foreground">
                          {formatCurrency(client.totalRevenue)}
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {client.invoiceCount} inv.
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 4 — Quick actions
      ══════════════════════════════════════════════════════════════════ */}
      <section aria-label="Quick actions">
        <Card className="bg-gradient-to-br from-card to-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
            <CardDescription>Jump straight to common tasks</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-3">
              <Button nativeButton={false} render={<Link href="/invoices/new" />}>
                <Plus className="mr-1.5 h-4 w-4" />
                Create Invoice
              </Button>

              <Button
                variant="outline"
                nativeButton={false} render={<Link href="/clients/new" />}
              >
                <Users className="mr-1.5 h-4 w-4" />
                Add Client
              </Button>

              <Button
                variant="outline"
                nativeButton={false} render={<Link href="/products/new" />}
              >
                <Package className="mr-1.5 h-4 w-4" />
                Add Product
              </Button>

              <Button
                variant="outline"
                nativeButton={false} render={<Link href="/reports" />}
              >
                <BarChart3 className="mr-1.5 h-4 w-4" />
                View Reports
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
