'use server'

import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNum(v: Prisma.Decimal | number | string): number {
  return typeof v === 'number' ? v : parseFloat(v.toString())
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SalesReportRow {
  clientId: string
  clientName: string
  invoiceCount: number
  subtotal: number
  vatAmount: number
  total: number
  amountPaid: number
  outstanding: number
}

export interface SalesReportByProduct {
  description: string
  productId: string | null
  quantity: number
  revenue: number
  vatAmount: number
}

export interface SalesReport {
  dateFrom: Date
  dateTo: Date
  totalRevenue: number
  totalVat: number
  totalInvoiced: number
  totalPaid: number
  totalOutstanding: number
  invoiceCount: number
  byClient: SalesReportRow[]
  byProduct: SalesReportByProduct[]
}

export interface VatBreakdownItem {
  vatType: string
  vatRate: number
  netAmount: number
  vatAmount: number
  label: string  // e.g. "Standard Rate (20%)"
}

export interface VatReport {
  dateFrom: Date
  dateTo: Date
  outputVat: number          // VAT charged to customers
  inputVat: number           // Placeholder — not tracked in this schema
  netVat: number             // outputVat - inputVat (VAT to pay/reclaim)
  totalNetSales: number      // Total ex-VAT sales
  totalGrossSales: number    // Total inc-VAT sales
  breakdown: VatBreakdownItem[]
}

export interface ProfitLossReport {
  dateFrom: Date
  dateTo: Date
  totalRevenue: number
  totalPaid: number
  totalOutstanding: number
  paidInvoiceCount: number
  sentInvoiceCount: number
  overdueInvoiceCount: number
  overdueAmount: number
  averageInvoiceValue: number
  averagePaymentDays: number | null
}

export interface ClientReportInvoice {
  id: string
  invoiceNumber: string
  issueDate: Date
  dueDate: Date
  total: number
  amountPaid: number
  status: string
}

export interface ClientReport {
  clientId: string
  clientName: string
  dateFrom: Date
  dateTo: Date
  totalInvoiced: number
  totalPaid: number
  totalOutstanding: number
  invoiceCount: number
  averageInvoiceValue: number
  invoices: ClientReportInvoice[]
}

// ---------------------------------------------------------------------------
// getSalesReport
// ---------------------------------------------------------------------------

export async function getSalesReport(
  orgId: string,
  dateFrom: Date,
  dateTo: Date,
): Promise<SalesReport> {
  if (!orgId) throw new Error('orgId is required')

  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        organizationId: orgId,
        issueDate: { gte: dateFrom, lte: dateTo },
        status: { notIn: ['CANCELLED'] },
      },
      include: {
        client: { select: { id: true, companyName: true } },
        items: {
          select: {
            productId: true,
            description: true,
            quantity: true,
            lineTotalExVat: true,
            vatAmount: true,
          },
        },
      },
    })

    // Aggregate by client
    const clientMap = new Map<
      string,
      { clientName: string; invoiceCount: number; subtotal: number; vatAmount: number; total: number; amountPaid: number }
    >()

    // Aggregate by product/description
    const productMap = new Map<
      string,
      { description: string; productId: string | null; quantity: number; revenue: number; vatAmount: number }
    >()

    let totalRevenue = 0
    let totalVat = 0
    let totalInvoiced = 0
    let totalPaid = 0

    for (const inv of invoices) {
      const subtotal = toNum(inv.subtotal)
      const vat = toNum(inv.vatAmount)
      const total = toNum(inv.total)
      const paid = toNum(inv.amountPaid)

      totalRevenue = round2(totalRevenue + subtotal)
      totalVat = round2(totalVat + vat)
      totalInvoiced = round2(totalInvoiced + total)
      totalPaid = round2(totalPaid + paid)

      // Client roll-up
      const clientKey = inv.clientId
      const cr = clientMap.get(clientKey)
      if (cr) {
        cr.invoiceCount += 1
        cr.subtotal = round2(cr.subtotal + subtotal)
        cr.vatAmount = round2(cr.vatAmount + vat)
        cr.total = round2(cr.total + total)
        cr.amountPaid = round2(cr.amountPaid + paid)
      } else {
        clientMap.set(clientKey, {
          clientName: inv.client.companyName,
          invoiceCount: 1,
          subtotal,
          vatAmount: vat,
          total,
          amountPaid: paid,
        })
      }

      // Product roll-up
      for (const item of inv.items) {
        const itemKey = item.productId ?? item.description
        const pr = productMap.get(itemKey)
        const qty = toNum(item.quantity)
        const revenue = toNum(item.lineTotalExVat)
        const itemVat = toNum(item.vatAmount)

        if (pr) {
          pr.quantity = round2(pr.quantity + qty)
          pr.revenue = round2(pr.revenue + revenue)
          pr.vatAmount = round2(pr.vatAmount + itemVat)
        } else {
          productMap.set(itemKey, {
            description: item.description,
            productId: item.productId,
            quantity: qty,
            revenue,
            vatAmount: itemVat,
          })
        }
      }
    }

    const byClient: SalesReportRow[] = Array.from(clientMap.entries()).map(([clientId, data]) => ({
      clientId,
      ...data,
      outstanding: round2(data.total - data.amountPaid),
    })).sort((a, b) => b.total - a.total)

    const byProduct: SalesReportByProduct[] = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)

    return {
      dateFrom,
      dateTo,
      totalRevenue,
      totalVat,
      totalInvoiced,
      totalPaid,
      totalOutstanding: round2(totalInvoiced - totalPaid),
      invoiceCount: invoices.length,
      byClient,
      byProduct,
    }
  } catch (error) {
    console.error('[getSalesReport]', error)
    throw new Error('Failed to generate sales report')
  }
}

// ---------------------------------------------------------------------------
// getVatReport
// ---------------------------------------------------------------------------

export async function getVatReport(
  orgId: string,
  dateFrom: Date,
  dateTo: Date,
): Promise<VatReport> {
  if (!orgId) throw new Error('orgId is required')

  const VAT_TYPE_LABELS: Record<string, string> = {
    STANDARD: 'Standard Rate',
    REDUCED: 'Reduced Rate',
    ZERO: 'Zero Rate',
    EXEMPT: 'Exempt',
    REVERSE_CHARGE: 'Reverse Charge',
  }

  try {
    // Fetch all VAT breakdowns for invoices in the period
    const vatBreakdowns = await prisma.vatBreakdown.findMany({
      where: {
        invoice: {
          organizationId: orgId,
          issueDate: { gte: dateFrom, lte: dateTo },
          status: { notIn: ['CANCELLED', 'DRAFT'] },
        },
      },
      select: {
        vatType: true,
        vatRate: true,
        netAmount: true,
        vatAmount: true,
      },
    })

    // Group by vatType + vatRate
    type VatKey = string
    const vatMap = new Map<
      VatKey,
      { vatType: string; vatRate: number; netAmount: number; vatAmount: number }
    >()

    let totalNetSales = 0
    let outputVat = 0

    for (const vb of vatBreakdowns) {
      const vatRate = toNum(vb.vatRate)
      const netAmount = toNum(vb.netAmount)
      const vatAmount = toNum(vb.vatAmount)
      const key: VatKey = `${vb.vatType}:${vatRate}`

      totalNetSales = round2(totalNetSales + netAmount)
      outputVat = round2(outputVat + vatAmount)

      const existing = vatMap.get(key)
      if (existing) {
        existing.netAmount = round2(existing.netAmount + netAmount)
        existing.vatAmount = round2(existing.vatAmount + vatAmount)
      } else {
        vatMap.set(key, { vatType: vb.vatType, vatRate, netAmount, vatAmount })
      }
    }

    const breakdown: VatBreakdownItem[] = Array.from(vatMap.values())
      .map((v) => ({
        vatType: v.vatType,
        vatRate: v.vatRate,
        netAmount: v.netAmount,
        vatAmount: v.vatAmount,
        label: `${VAT_TYPE_LABELS[v.vatType] ?? v.vatType} (${v.vatRate}%)`,
      }))
      .sort((a, b) => b.vatRate - a.vatRate)

    // Input VAT is not tracked in this schema (no purchase invoices)
    const inputVat = 0

    return {
      dateFrom,
      dateTo,
      outputVat,
      inputVat,
      netVat: round2(outputVat - inputVat),
      totalNetSales,
      totalGrossSales: round2(totalNetSales + outputVat),
      breakdown,
    }
  } catch (error) {
    console.error('[getVatReport]', error)
    throw new Error('Failed to generate VAT report')
  }
}

// ---------------------------------------------------------------------------
// getProfitLossReport
// ---------------------------------------------------------------------------

export async function getProfitLossReport(
  orgId: string,
  dateFrom: Date,
  dateTo: Date,
): Promise<ProfitLossReport> {
  if (!orgId) throw new Error('orgId is required')

  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        organizationId: orgId,
        issueDate: { gte: dateFrom, lte: dateTo },
        status: { notIn: ['CANCELLED'] },
      },
      include: {
        payments: {
          select: { paidAt: true },
          orderBy: { paidAt: 'asc' },
          take: 1,
        },
      },
    })

    let totalRevenue = 0
    let totalPaid = 0
    let overdueAmount = 0
    let paidCount = 0
    let sentCount = 0
    let overdueCount = 0
    let paymentDaySum = 0
    let paymentDayCount = 0

    for (const inv of invoices) {
      const total = toNum(inv.total)
      const paid = toNum(inv.amountPaid)
      totalRevenue = round2(totalRevenue + total)
      totalPaid = round2(totalPaid + paid)

      if (inv.status === 'PAID') {
        paidCount++
        // Calculate payment days if we have a first payment
        if (inv.payments[0]) {
          const issueDayMs = inv.issueDate.getTime()
          const paidDayMs = inv.payments[0].paidAt.getTime()
          const days = Math.round((paidDayMs - issueDayMs) / (1000 * 60 * 60 * 24))
          if (days >= 0) {
            paymentDaySum += days
            paymentDayCount++
          }
        }
      } else if (inv.status === 'SENT') {
        sentCount++
      } else if (inv.status === 'OVERDUE') {
        overdueCount++
        overdueAmount = round2(overdueAmount + (total - paid))
      }
    }

    const averagePaymentDays = paymentDayCount > 0 ? Math.round(paymentDaySum / paymentDayCount) : null
    const averageInvoiceValue = invoices.length > 0 ? round2(totalRevenue / invoices.length) : 0

    return {
      dateFrom,
      dateTo,
      totalRevenue,
      totalPaid,
      totalOutstanding: round2(totalRevenue - totalPaid),
      paidInvoiceCount: paidCount,
      sentInvoiceCount: sentCount,
      overdueInvoiceCount: overdueCount,
      overdueAmount,
      averageInvoiceValue,
      averagePaymentDays,
    }
  } catch (error) {
    console.error('[getProfitLossReport]', error)
    throw new Error('Failed to generate profit & loss report')
  }
}

// ---------------------------------------------------------------------------
// getClientReport
// ---------------------------------------------------------------------------

export async function getClientReport(
  orgId: string,
  clientId: string,
  dateFrom: Date,
  dateTo: Date,
): Promise<ClientReport> {
  if (!orgId) throw new Error('orgId is required')
  if (!clientId) throw new Error('clientId is required')

  try {
    const [client, invoices] = await Promise.all([
      prisma.client.findFirst({
        where: { id: clientId, organizationId: orgId },
        select: { id: true, companyName: true },
      }),
      prisma.invoice.findMany({
        where: {
          organizationId: orgId,
          clientId,
          issueDate: { gte: dateFrom, lte: dateTo },
          status: { notIn: ['CANCELLED'] },
        },
        select: {
          id: true,
          invoiceNumber: true,
          issueDate: true,
          dueDate: true,
          total: true,
          amountPaid: true,
          status: true,
        },
        orderBy: { issueDate: 'desc' },
      }),
    ])

    if (!client) throw new Error('Client not found')

    let totalInvoiced = 0
    let totalPaid = 0

    const reportInvoices: ClientReportInvoice[] = invoices.map((inv) => {
      const total = toNum(inv.total)
      const paid = toNum(inv.amountPaid)
      totalInvoiced = round2(totalInvoiced + total)
      totalPaid = round2(totalPaid + paid)

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        total,
        amountPaid: paid,
        status: inv.status,
      }
    })

    return {
      clientId,
      clientName: client.companyName,
      dateFrom,
      dateTo,
      totalInvoiced,
      totalPaid,
      totalOutstanding: round2(totalInvoiced - totalPaid),
      invoiceCount: invoices.length,
      averageInvoiceValue: invoices.length > 0 ? round2(totalInvoiced / invoices.length) : 0,
      invoices: reportInvoices,
    }
  } catch (error) {
    console.error('[getClientReport]', error)
    throw new Error('Failed to generate client report')
  }
}
