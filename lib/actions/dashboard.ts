'use server'

import prisma from '@/lib/prisma'
import { InvoiceStatus } from '@prisma/client'
import type { DashboardStats, MonthlyRevenue, TopClient, RecentInvoice } from '@/types'

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

function toNumber(val: unknown): number {
  if (val === null || val === undefined) return 0
  if (typeof val === 'number') return val
  // Prisma Decimal comes back as an object with toString()
  return parseFloat(String(val)) || 0
}

// ─────────────────────────────────────────────
// getDashboardStats
// ─────────────────────────────────────────────

/**
 * Fetch all data required to render the dashboard home page for a given org.
 *
 * @param orgId - The InvoiceForge (Prisma) organisation ID
 */
export async function getDashboardStats(orgId: string): Promise<DashboardStats> {
  if (!orgId) throw new Error('orgId is required')

  const now = new Date()
  const thisMonthStart = startOfMonth(now)
  const thisMonthEnd = endOfMonth(now)

  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthStart = startOfMonth(lastMonthDate)
  const lastMonthEnd = endOfMonth(lastMonthDate)

  // ── Run all queries in parallel ──────────────────────────────────────────

  const [
    paidThisMonth,
    paidLastMonth,
    outstandingInvoices,
    overdueInvoices,
    draftInvoices,
    totalInvoicesThisMonth,
    topClientRows,
    recentInvoiceRows,
  ] = await Promise.all([
    // Revenue this month (PAID invoices)
    prisma.invoice.aggregate({
      where: {
        organizationId: orgId,
        status: InvoiceStatus.PAID,
        issueDate: { gte: thisMonthStart, lte: thisMonthEnd },
      },
      _sum: { total: true },
      _count: { id: true },
    }),

    // Revenue last month (PAID invoices)
    prisma.invoice.aggregate({
      where: {
        organizationId: orgId,
        status: InvoiceStatus.PAID,
        issueDate: { gte: lastMonthStart, lte: lastMonthEnd },
      },
      _sum: { total: true },
    }),

    // Outstanding (SENT)
    prisma.invoice.aggregate({
      where: { organizationId: orgId, status: InvoiceStatus.SENT },
      _sum: { total: true },
      _count: { id: true },
    }),

    // Overdue
    prisma.invoice.aggregate({
      where: { organizationId: orgId, status: InvoiceStatus.OVERDUE },
      _sum: { total: true },
      _count: { id: true },
    }),

    // Draft
    prisma.invoice.aggregate({
      where: { organizationId: orgId, status: InvoiceStatus.DRAFT },
      _count: { id: true },
    }),

    // Total invoices this month (all statuses)
    prisma.invoice.count({
      where: {
        organizationId: orgId,
        issueDate: { gte: thisMonthStart, lte: thisMonthEnd },
      },
    }),

    // Top 5 clients by total revenue (PAID invoices, all time)
    prisma.invoice.groupBy({
      by: ['clientId'],
      where: {
        organizationId: orgId,
        status: InvoiceStatus.PAID,
      },
      _sum: { total: true },
      _count: { id: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 5,
    }),

    // Last 10 invoices (most recent first)
    prisma.invoice.findMany({
      where: { organizationId: orgId },
      orderBy: { issueDate: 'desc' },
      take: 10,
      include: {
        client: { select: { companyName: true } },
      },
    }),
  ])

  // ── Resolve client names for top clients ────────────────────────────────

  let topClients: TopClient[] = []

  if (topClientRows.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clientIds = topClientRows.map((r: any) => r.clientId)
    const clients = await prisma.client.findMany({
      where: { id: { in: clientIds } },
      select: { id: true, companyName: true },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clientMap = new Map(clients.map((c: any) => [c.id, c.companyName]))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    topClients = topClientRows.map((row: any) => ({
      id: row.clientId,
      companyName: clientMap.get(row.clientId) ?? 'Unknown Client',
      totalRevenue: toNumber(row._sum.total),
      invoiceCount: row._count.id,
    }))
  }

  // ── Shape recent invoices ───────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recentInvoices: RecentInvoice[] = recentInvoiceRows.map((inv: any) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    clientName: inv.client.companyName,
    total: toNumber(inv.total),
    status: inv.status,
    dueDate: inv.dueDate,
  }))

  return {
    revenueThisMonth: toNumber(paidThisMonth._sum.total),
    revenueLastMonth: toNumber(paidLastMonth._sum.total),
    outstandingAmount: toNumber(outstandingInvoices._sum.total),
    overdueAmount: toNumber(overdueInvoices._sum.total),
    totalInvoices: totalInvoicesThisMonth,
    paidInvoices: paidThisMonth._count.id,
    overdueInvoices: overdueInvoices._count.id,
    draftInvoices: draftInvoices._count.id,
    topClients,
    recentInvoices,
  }
}

// ─────────────────────────────────────────────
// getMonthlyRevenueData
// ─────────────────────────────────────────────

/**
 * Return last 12 months of revenue grouped by month (calendar month, oldest first).
 * Each entry contains total paid revenue and total outstanding (SENT + OVERDUE).
 *
 * @param orgId - The InvoiceForge (Prisma) organisation ID
 */
export async function getMonthlyRevenueData(orgId: string): Promise<MonthlyRevenue[]> {
  if (!orgId) throw new Error('orgId is required')

  const now = new Date()

  // Build 12-month buckets (oldest → newest)
  const buckets: Array<{ year: number; month: number; start: Date; end: Date }> = []

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      start: startOfMonth(d),
      end: endOfMonth(d),
    })
  }

  // Fetch paid and outstanding invoices in one go for the whole 12-month window
  const windowStart = buckets[0].start
  const windowEnd = buckets[buckets.length - 1].end

  const [paidInvoices, outstandingInvoices] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        organizationId: orgId,
        status: InvoiceStatus.PAID,
        issueDate: { gte: windowStart, lte: windowEnd },
      },
      select: { issueDate: true, total: true },
    }),
    prisma.invoice.findMany({
      where: {
        organizationId: orgId,
        status: { in: [InvoiceStatus.SENT, InvoiceStatus.OVERDUE, InvoiceStatus.PARTIAL] },
        issueDate: { gte: windowStart, lte: windowEnd },
      },
      select: { issueDate: true, total: true },
    }),
  ])

  // Aggregate into buckets
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return buckets.map(({ year, month, start, end }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paid = paidInvoices
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((inv: any) => inv.issueDate >= start && inv.issueDate <= end)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .reduce((sum: number, inv: any) => sum + toNumber(inv.total), 0)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const outstanding = outstandingInvoices
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((inv: any) => inv.issueDate >= start && inv.issueDate <= end)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .reduce((sum: number, inv: any) => sum + toNumber(inv.total), 0)

    return {
      month: `${MONTH_NAMES[month]} ${year}`,
      revenue: paid + outstanding,
      paid,
      outstanding,
    }
  })
}
