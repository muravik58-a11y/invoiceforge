'use server'

import { revalidatePath } from 'next/cache'
import type { Payment, PaymentMethod, Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { createAuditLog } from '@/lib/actions/audit'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function toNum(v: Prisma.Decimal | number | string): number {
  return typeof v === 'number' ? v : parseFloat(v.toString())
}

// ---------------------------------------------------------------------------
// getPayments
// ---------------------------------------------------------------------------

/**
 * Fetch payments for an organisation, optionally filtered by invoice or date range.
 */
export async function getPayments(
  orgId: string,
  filters?: {
    invoiceId?: string
    dateFrom?: Date
    dateTo?: Date
    page?: number
    limit?: number
  },
): Promise<{
  payments: Payment[]
  total: number
  page: number
  limit: number
  totalPages: number
}> {
  if (!orgId) throw new Error('orgId is required')

  const page = filters?.page ?? 1
  const limit = filters?.limit ?? 50
  const skip = (page - 1) * limit

  const where: Prisma.PaymentWhereInput = {
    organizationId: orgId,
    ...(filters?.invoiceId && { invoiceId: filters.invoiceId }),
    ...(filters?.dateFrom || filters?.dateTo
      ? {
          paidAt: {
            ...(filters?.dateFrom && { gte: filters.dateFrom }),
            ...(filters?.dateTo && { lte: filters.dateTo }),
          },
        }
      : {}),
  }

  try {
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paidAt: 'desc' },
        include: {
          invoice: {
            select: {
              invoiceNumber: true,
              clientId: true,
              total: true,
              client: { select: { companyName: true } },
            },
          },
        },
      }),
      prisma.payment.count({ where }),
    ])

    return {
      payments: payments as unknown as Payment[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  } catch (error) {
    console.error('[getPayments]', error)
    throw new Error('Failed to fetch payments')
  }
}

// ---------------------------------------------------------------------------
// recordPayment
// ---------------------------------------------------------------------------

/**
 * Record a manual payment against an invoice, then update the invoice status
 * and amountPaid accordingly.
 */
export async function recordPayment(
  orgId: string,
  invoiceId: string,
  userId: string,
  data: {
    amount: number
    method: string
    reference?: string
    paidAt: Date
    notes?: string
  },
): Promise<Payment> {
  if (!orgId) throw new Error('orgId is required')
  if (!invoiceId) throw new Error('invoiceId is required')
  if (!data.amount || data.amount <= 0) throw new Error('Payment amount must be positive')

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId: orgId },
    select: {
      id: true,
      total: true,
      amountPaid: true,
      status: true,
      clientId: true,
      invoiceNumber: true,
    },
  })
  if (!invoice) throw new Error('Invoice not found')
  if (invoice.status === 'CANCELLED') throw new Error('Cannot record payment on a cancelled invoice')
  if (invoice.status === 'PAID') throw new Error('Invoice is already fully paid')

  const totalNum = toNum(invoice.total)
  const alreadyPaid = toNum(invoice.amountPaid)
  const newAmountPaid = round2(alreadyPaid + data.amount)

  let newStatus: string
  if (newAmountPaid >= totalNum) {
    newStatus = 'PAID'
  } else if (newAmountPaid > 0) {
    newStatus = 'PARTIAL'
  } else {
    newStatus = invoice.status
  }

  try {
    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          organizationId: orgId,
          invoiceId,
          amount: data.amount,
          method: data.method as PaymentMethod,
          reference: data.reference ?? null,
          notes: data.notes ?? null,
          paidAt: data.paidAt,
        },
      })

      await tx.invoice.update({
        where: { id: invoiceId },
        data: { amountPaid: newAmountPaid, status: newStatus as import('@prisma/client').InvoiceStatus },
      })

      return created
    })

    // Success notification
    await prisma.notification.create({
      data: {
        organizationId: orgId,
        title: `Payment received – ${invoice.invoiceNumber}`,
        message: `£${data.amount.toFixed(2)} recorded via ${data.method.replace(/_/g, ' ').toLowerCase()}`,
        type: 'SUCCESS',
        link: `/invoices/${invoiceId}`,
      },
    }).catch((e) => console.error('[recordPayment] notification failed', e))

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'payment.recorded',
      entityType: 'Payment',
      entityId: payment.id,
      changes: {
        amount: data.amount,
        method: data.method,
        reference: data.reference,
        invoiceNewStatus: newStatus,
        newAmountPaid,
      },
      invoiceId,
      clientId: invoice.clientId,
    }).catch((e) => console.error('[recordPayment] audit log failed', e))

    revalidatePath('/invoices')
    revalidatePath(`/invoices/${invoiceId}`)
    revalidatePath('/payments')
    return payment
  } catch (error) {
    console.error('[recordPayment]', error)
    throw new Error('Failed to record payment')
  }
}

// ---------------------------------------------------------------------------
// deletePayment
// ---------------------------------------------------------------------------

/**
 * Delete a payment record and reverse the invoice amountPaid and status.
 */
export async function deletePayment(
  orgId: string,
  paymentId: string,
  userId: string,
): Promise<void> {
  if (!orgId) throw new Error('orgId is required')
  if (!paymentId) throw new Error('paymentId is required')

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, organizationId: orgId },
    include: {
      invoice: {
        select: {
          id: true,
          total: true,
          amountPaid: true,
          status: true,
          clientId: true,
          invoiceNumber: true,
        },
      },
    },
  })
  if (!payment) throw new Error('Payment not found')

  const invoice = payment.invoice
  const paidAmount = toNum(payment.amount)
  const currentAmountPaid = toNum(invoice.amountPaid)
  const newAmountPaid = Math.max(0, round2(currentAmountPaid - paidAmount))
  const totalNum = toNum(invoice.total)

  // Determine revised status after removing this payment
  let newStatus: string
  if (invoice.status === 'PAID' || invoice.status === 'PARTIAL' || invoice.status === 'OVERDUE') {
    if (newAmountPaid <= 0) {
      // If the invoice was previously OVERDUE, restore that; otherwise SENT
      newStatus = invoice.status === 'OVERDUE' ? 'OVERDUE' : 'SENT'
    } else if (newAmountPaid < totalNum) {
      newStatus = 'PARTIAL'
    } else {
      newStatus = 'PAID'
    }
  } else {
    newStatus = invoice.status
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.payment.delete({ where: { id: paymentId } })
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          amountPaid: newAmountPaid,
          status: newStatus as import('@prisma/client').InvoiceStatus,
        },
      })
    })

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'payment.deleted',
      entityType: 'Payment',
      entityId: paymentId,
      changes: {
        deletedAmount: paidAmount,
        invoiceId: invoice.id,
        previousStatus: invoice.status,
        newStatus,
        newAmountPaid,
      },
      invoiceId: invoice.id,
      clientId: invoice.clientId,
    }).catch((e) => console.error('[deletePayment] audit log failed', e))

    revalidatePath('/invoices')
    revalidatePath(`/invoices/${invoice.id}`)
    revalidatePath('/payments')
  } catch (error) {
    console.error('[deletePayment]', error)
    throw new Error('Failed to delete payment')
  }
}
