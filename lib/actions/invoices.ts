'use server'

import { revalidatePath } from 'next/cache'
import type { Invoice, InvoiceStatus, Prisma, VatType } from '@prisma/client'
import prisma from '@/lib/prisma'
import { getNextInvoiceNumber } from '@/lib/actions/organization'
import { generateInvoicePdf } from '@/lib/pdf/invoice-pdf'
import { sendInvoiceEmail } from '@/lib/resend'
import { createPaymentLink } from '@/lib/stripe'
import { createAuditLog } from '@/lib/actions/audit'
import { serialize } from '@/lib/serialize'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InvoiceItemInput {
  productId?: string
  description: string
  quantity: number
  unitPrice: number   // ex-VAT, in pounds
  vatRate: number     // e.g. 20 for 20%
  vatType: string     // VatType enum value
  unit?: string
  sortOrder?: number
}

export interface InvoiceCreateData {
  clientId: string
  issueDate: Date
  dueDate: Date
  items: InvoiceItemInput[]
  discountPercent?: number
  notes?: string
  terms?: string
  templateId?: string
  poNumber?: string
  reference?: string
}

export interface InvoiceWithRelations extends Invoice {
  client: {
    id: string
    companyName: string
    contactName: string | null
    email: string | null
    phone: string | null
    vatNumber: string | null
    addressLine1: string | null
    addressLine2: string | null
    city: string | null
    county: string | null
    postcode: string | null
    country: string | null
  }
  items: {
    id: string
    invoiceId: string
    productId: string | null
    description: string
    quantity: Prisma.Decimal
    unitPrice: Prisma.Decimal
    vatRate: Prisma.Decimal
    vatType: VatType
    vatAmount: Prisma.Decimal
    lineTotal: Prisma.Decimal
    lineTotalExVat: Prisma.Decimal
    unit: string | null
    sortOrder: number
  }[]
  vatBreakdowns: {
    id: string
    invoiceId: string
    vatRate: Prisma.Decimal
    vatType: VatType
    netAmount: Prisma.Decimal
    vatAmount: Prisma.Decimal
  }[]
  payments: {
    id: string
    organizationId: string
    invoiceId: string
    amount: Prisma.Decimal
    method: string
    reference: string | null
    notes: string | null
    paidAt: Date
    stripePaymentId: string | null
    createdAt: Date
  }[]
  auditLogs: {
    id: string
    userId: string
    userEmail: string
    action: string
    entityType: string
    entityId: string
    changes: Prisma.JsonValue
    createdAt: Date
  }[]
}

export interface PaginatedInvoices {
  invoices: Invoice[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Round a number to 2 decimal places (banker's rounding via toFixed). */
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Convert Prisma Prisma.Decimal or number to a plain JS number. */
function toNum(v: Prisma.Decimal | number | string): number {
  return typeof v === 'number' ? v : parseFloat(v.toString())
}

// ---------------------------------------------------------------------------
// getInvoices
// ---------------------------------------------------------------------------

export async function getInvoices(
  orgId: string,
  filters?: {
    status?: string
    clientId?: string
    search?: string
    dateFrom?: Date
    dateTo?: Date
    page?: number
    limit?: number
  },
): Promise<PaginatedInvoices> {
  if (!orgId) throw new Error('orgId is required')

  const page = filters?.page ?? 1
  const limit = filters?.limit ?? 20
  const skip = (page - 1) * limit

  const where: Prisma.InvoiceWhereInput = {
    organizationId: orgId,
    ...(filters?.status && { status: filters.status as InvoiceStatus }),
    ...(filters?.clientId && { clientId: filters.clientId }),
    ...(filters?.dateFrom || filters?.dateTo
      ? {
          issueDate: {
            ...(filters.dateFrom && { gte: filters.dateFrom }),
            ...(filters.dateTo && { lte: filters.dateTo }),
          },
        }
      : {}),
    ...(filters?.search
      ? {
          OR: [
            { invoiceNumber: { contains: filters.search, mode: 'insensitive' } },
            { client: { companyName: { contains: filters.search, mode: 'insensitive' } } },
            { reference: { contains: filters.search, mode: 'insensitive' } },
            { poNumber: { contains: filters.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  }

  try {
    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { issueDate: 'desc' },
        include: {
          client: {
            select: { id: true, companyName: true, email: true },
          },
        },
      }),
      prisma.invoice.count({ where }),
    ])

    return {
      invoices: serialize(invoices) as unknown as Invoice[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  } catch (error) {
    console.error('[getInvoices]', error)
    throw new Error('Failed to fetch invoices')
  }
}

// ---------------------------------------------------------------------------
// getInvoice
// ---------------------------------------------------------------------------

export async function getInvoice(
  orgId: string,
  invoiceId: string,
): Promise<InvoiceWithRelations | null> {
  if (!orgId) throw new Error('orgId is required')
  if (!invoiceId) throw new Error('invoiceId is required')

  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId: orgId },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
            email: true,
            phone: true,
            vatNumber: true,
            addressLine1: true,
            addressLine2: true,
            city: true,
            county: true,
            postcode: true,
            country: true,
          },
        },
        items: {
          orderBy: { sortOrder: 'asc' },
        },
        vatBreakdowns: {
          orderBy: { vatRate: 'asc' },
        },
        payments: {
          orderBy: { paidAt: 'desc' },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    })

    return invoice as InvoiceWithRelations | null
  } catch (error) {
    console.error('[getInvoice]', error)
    throw new Error('Failed to fetch invoice')
  }
}

// ---------------------------------------------------------------------------
// createInvoice
// ---------------------------------------------------------------------------

export async function createInvoice(
  orgId: string,
  userId: string,
  data: InvoiceCreateData,
): Promise<Invoice> {
  if (!orgId) throw new Error('orgId is required')
  if (!userId) throw new Error('userId is required')
  if (!data.clientId) throw new Error('clientId is required')
  if (!data.items?.length) throw new Error('At least one item is required')

  // Validate client belongs to org
  const client = await prisma.client.findFirst({
    where: { id: data.clientId, organizationId: orgId },
    select: { id: true },
  })
  if (!client) throw new Error('Client not found')

  // Generate invoice number (atomic counter increment)
  const invoiceNumber = await getNextInvoiceNumber(orgId)

  // ── Calculate line totals ─────────────────────────────────────────────────
  type VatKey = string // `${vatType}:${vatRate}`
  const vatMap = new Map<VatKey, { vatType: string; vatRate: number; netAmount: number; vatAmount: number }>()

  let subtotal = 0

  const preparedItems = data.items.map((item, idx) => {
    const qty = item.quantity
    const unitPrice = item.unitPrice
    const lineTotalExVat = round2(qty * unitPrice)
    const vatAmount = round2(lineTotalExVat * (item.vatRate / 100))
    const lineTotal = round2(lineTotalExVat + vatAmount)

    subtotal = round2(subtotal + lineTotalExVat)

    // Accumulate VAT breakdown
    const key: VatKey = `${item.vatType}:${item.vatRate}`
    const existing = vatMap.get(key)
    if (existing) {
      existing.netAmount = round2(existing.netAmount + lineTotalExVat)
      existing.vatAmount = round2(existing.vatAmount + vatAmount)
    } else {
      vatMap.set(key, {
        vatType: item.vatType,
        vatRate: item.vatRate,
        netAmount: lineTotalExVat,
        vatAmount,
      })
    }

    return {
      productId: item.productId ?? null,
      description: item.description,
      quantity: qty,
      unitPrice,
      vatRate: item.vatRate,
      vatType: item.vatType as VatType,
      vatAmount,
      lineTotalExVat,
      lineTotal,
      unit: item.unit ?? 'unit',
      sortOrder: item.sortOrder ?? idx,
    }
  })

  // Apply discount
  const discountPercent = data.discountPercent ?? 0
  const discountAmount = round2(subtotal * (discountPercent / 100))
  const subtotalAfterDiscount = round2(subtotal - discountAmount)

  // Total VAT (applied proportionally after discount — simplified: apply discount then recalc VAT)
  // In practice, UK invoices apply discount before VAT calculation
  const discountFactor = discountPercent > 0 ? (100 - discountPercent) / 100 : 1
  let totalVat = 0
  const vatBreakdownRecords: { vatType: VatType; vatRate: number; netAmount: number; vatAmount: number }[] = []

  for (const [, vb] of vatMap) {
    const adjustedNet = round2(vb.netAmount * discountFactor)
    const adjustedVat = round2(vb.vatAmount * discountFactor)
    totalVat = round2(totalVat + adjustedVat)
    vatBreakdownRecords.push({
      vatType: vb.vatType as VatType,
      vatRate: vb.vatRate,
      netAmount: adjustedNet,
      vatAmount: adjustedVat,
    })
  }

  const total = round2(subtotalAfterDiscount + totalVat)

  try {
    const invoice = await prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          organizationId: orgId,
          clientId: data.clientId,
          invoiceNumber,
          issueDate: data.issueDate,
          dueDate: data.dueDate,
          subtotal,
          discountAmount,
          discountPercent,
          vatAmount: totalVat,
          total,
          amountPaid: 0,
          status: 'DRAFT',
          notes: data.notes ?? null,
          terms: data.terms ?? null,
          templateId: data.templateId ?? null,
          poNumber: data.poNumber ?? null,
          reference: data.reference ?? null,
          items: {
            createMany: { data: preparedItems },
          },
          vatBreakdowns: {
            createMany: { data: vatBreakdownRecords },
          },
        },
      })

      return created
    })

    // Audit log (outside transaction — non-critical)
    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'invoice.created',
      entityType: 'Invoice',
      entityId: invoice.id,
      changes: { invoiceNumber, total, clientId: data.clientId },
      invoiceId: invoice.id,
      clientId: data.clientId,
    }).catch((e) => console.error('[createInvoice] audit log failed', e))

    revalidatePath('/invoices')
    return serialize(invoice) as typeof invoice
  } catch (error) {
    console.error('[createInvoice]', error)
    throw new Error('Failed to create invoice')
  }
}

// ---------------------------------------------------------------------------
// updateInvoice
// ---------------------------------------------------------------------------

export async function updateInvoice(
  orgId: string,
  invoiceId: string,
  userId: string,
  data: Partial<InvoiceCreateData>,
): Promise<Invoice> {
  if (!orgId) throw new Error('orgId is required')
  if (!invoiceId) throw new Error('invoiceId is required')

  const existing = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId: orgId },
    select: { id: true, status: true, invoiceNumber: true },
  })
  if (!existing) throw new Error('Invoice not found')
  if (existing.status !== 'DRAFT') throw new Error('Only DRAFT invoices can be edited')

  // Build updated financials if items are provided
  let updatePayload: Prisma.InvoiceUpdateInput = {}
  let newVatBreakdowns: { vatType: VatType; vatRate: number; netAmount: number; vatAmount: number }[] = []
  let newItems: Array<{
    productId: string | null
    description: string
    quantity: number
    unitPrice: number
    vatRate: number
    vatType: VatType
    vatAmount: number
    lineTotalExVat: number
    lineTotal: number
    unit: string
    sortOrder: number
  }> = []

  if (data.items?.length) {
    type VatKey = string
    const vatMap = new Map<VatKey, { vatType: string; vatRate: number; netAmount: number; vatAmount: number }>()
    let subtotal = 0

    newItems = data.items.map((item, idx) => {
      const qty = item.quantity
      const lineTotalExVat = round2(qty * item.unitPrice)
      const vatAmount = round2(lineTotalExVat * (item.vatRate / 100))
      const lineTotal = round2(lineTotalExVat + vatAmount)
      subtotal = round2(subtotal + lineTotalExVat)

      const key: VatKey = `${item.vatType}:${item.vatRate}`
      const ev = vatMap.get(key)
      if (ev) {
        ev.netAmount = round2(ev.netAmount + lineTotalExVat)
        ev.vatAmount = round2(ev.vatAmount + vatAmount)
      } else {
        vatMap.set(key, { vatType: item.vatType, vatRate: item.vatRate, netAmount: lineTotalExVat, vatAmount })
      }

      return {
        productId: item.productId ?? null,
        description: item.description,
        quantity: qty,
        unitPrice: item.unitPrice,
        vatRate: item.vatRate,
        vatType: item.vatType as VatType,
        vatAmount,
        lineTotalExVat,
        lineTotal,
        unit: item.unit ?? 'unit',
        sortOrder: item.sortOrder ?? idx,
      }
    })

    const discountPercent = data.discountPercent ?? 0
    const discountAmount = round2(subtotal * (discountPercent / 100))
    const discountFactor = discountPercent > 0 ? (100 - discountPercent) / 100 : 1
    let totalVat = 0

    for (const [, vb] of vatMap) {
      const adjustedNet = round2(vb.netAmount * discountFactor)
      const adjustedVat = round2(vb.vatAmount * discountFactor)
      totalVat = round2(totalVat + adjustedVat)
      newVatBreakdowns.push({ vatType: vb.vatType as VatType, vatRate: vb.vatRate, netAmount: adjustedNet, vatAmount: adjustedVat })
    }

    const total = round2(subtotal - discountAmount + totalVat)

    updatePayload = {
      subtotal,
      discountAmount,
      discountPercent,
      vatAmount: totalVat,
      total,
    }
  }

  // Merge remaining fields
  if (data.clientId) updatePayload.client = { connect: { id: data.clientId } }
  if (data.issueDate) updatePayload.issueDate = data.issueDate
  if (data.dueDate) updatePayload.dueDate = data.dueDate
  if (data.notes !== undefined) updatePayload.notes = data.notes
  if (data.terms !== undefined) updatePayload.terms = data.terms
  if (data.templateId !== undefined) updatePayload.templateId = data.templateId
  if (data.poNumber !== undefined) updatePayload.poNumber = data.poNumber
  if (data.reference !== undefined) updatePayload.reference = data.reference

  try {
    const invoice = await prisma.$transaction(async (tx) => {
      if (newItems.length) {
        // Replace items and vat breakdowns
        await tx.invoiceItem.deleteMany({ where: { invoiceId } })
        await tx.vatBreakdown.deleteMany({ where: { invoiceId } })

        await tx.invoiceItem.createMany({ data: newItems.map((i) => ({ ...i, invoiceId })) })
        await tx.vatBreakdown.createMany({ data: newVatBreakdowns.map((v) => ({ ...v, invoiceId })) })
      }

      return tx.invoice.update({ where: { id: invoiceId }, data: updatePayload })
    })

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'invoice.updated',
      entityType: 'Invoice',
      entityId: invoiceId,
      changes: data,
      invoiceId,
    }).catch((e) => console.error('[updateInvoice] audit log failed', e))

    revalidatePath('/invoices')
    revalidatePath(`/invoices/${invoiceId}`)
    return serialize(invoice) as typeof invoice
  } catch (error) {
    console.error('[updateInvoice]', error)
    throw new Error('Failed to update invoice')
  }
}

// ---------------------------------------------------------------------------
// deleteInvoice
// ---------------------------------------------------------------------------

export async function deleteInvoice(
  orgId: string,
  invoiceId: string,
  userId: string,
): Promise<void> {
  if (!orgId) throw new Error('orgId is required')
  if (!invoiceId) throw new Error('invoiceId is required')

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId: orgId },
    select: { id: true, status: true, invoiceNumber: true },
  })
  if (!invoice) throw new Error('Invoice not found')
  if (invoice.status !== 'DRAFT') throw new Error('Only DRAFT invoices can be deleted')

  try {
    await prisma.invoice.delete({ where: { id: invoiceId } })

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'invoice.deleted',
      entityType: 'Invoice',
      entityId: invoiceId,
      changes: { invoiceNumber: invoice.invoiceNumber },
      invoiceId,
    }).catch((e) => console.error('[deleteInvoice] audit log failed', e))

    revalidatePath('/invoices')
  } catch (error) {
    console.error('[deleteInvoice]', error)
    throw new Error('Failed to delete invoice')
  }
}

// ---------------------------------------------------------------------------
// sendInvoice
// ---------------------------------------------------------------------------

export async function sendInvoice(
  orgId: string,
  invoiceId: string,
  userId: string,
): Promise<void> {
  if (!orgId) throw new Error('orgId is required')
  if (!invoiceId) throw new Error('invoiceId is required')

  const [invoice, organization] = await Promise.all([
    prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId: orgId },
      include: {
        client: true,
        items: { orderBy: { sortOrder: 'asc' } },
        vatBreakdowns: { orderBy: { vatRate: 'asc' } },
        payments: true,
        auditLogs: false,
      },
    }),
    prisma.organization.findUnique({ where: { id: orgId } }),
  ])

  if (!invoice) throw new Error('Invoice not found')
  if (!organization) throw new Error('Organisation not found')
  if (!invoice.client.email) throw new Error('Client has no email address')
  if (invoice.status === 'CANCELLED') throw new Error('Cannot send a cancelled invoice')

  try {
    // Generate PDF using the org's preferred template
    const template = (organization.preferredTemplate ?? 'modern') as 'modern' | 'classic' | 'branded'
    const pdfBuffer = await generateInvoicePdf(invoice, organization, template)

    // Format amounts for email (convert decimal pounds → pence for resend helper)
    const subtotalPence = Math.round(toNum(invoice.subtotal) * 100)
    const vatPence = Math.round(toNum(invoice.vatAmount) * 100)
    const totalPence = Math.round(toNum(invoice.total) * 100)

    const formatUkDate = (d: Date) =>
      d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })

    await sendInvoiceEmail(invoice.client.email, pdfBuffer, {
      invoiceNumber: invoice.invoiceNumber,
      clientName: invoice.client.companyName,
      issueDate: formatUkDate(invoice.issueDate),
      dueDate: formatUkDate(invoice.dueDate),
      subtotal: subtotalPence,
      tax: vatPence,
      total: totalPence,
      currency: 'GBP',
      paymentLink: invoice.stripePaymentLinkUrl ?? undefined,
      orgName: organization.companyName ?? organization.name,
      orgEmail: '', // org contact email not in schema — left blank
    })

    // Update invoice status
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    })

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'invoice.sent',
      entityType: 'Invoice',
      entityId: invoiceId,
      changes: { sentAt: new Date().toISOString() },
      invoiceId,
      clientId: invoice.clientId,
    }).catch((e) => console.error('[sendInvoice] audit log failed', e))

    revalidatePath('/invoices')
    revalidatePath(`/invoices/${invoiceId}`)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[sendInvoice]', msg)
    throw new Error(msg)
  }
}

// ---------------------------------------------------------------------------
// markInvoicePaid
// ---------------------------------------------------------------------------

export async function markInvoicePaid(
  orgId: string,
  invoiceId: string,
  userId: string,
  paymentData: {
    amount: number
    method: string
    reference?: string
    paidAt: Date
    notes?: string
  },
): Promise<void> {
  if (!orgId) throw new Error('orgId is required')
  if (!invoiceId) throw new Error('invoiceId is required')
  if (!paymentData.amount || paymentData.amount <= 0) throw new Error('Payment amount must be positive')

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId: orgId },
    select: { id: true, total: true, amountPaid: true, status: true, clientId: true, invoiceNumber: true },
  })
  if (!invoice) throw new Error('Invoice not found')
  if (invoice.status === 'CANCELLED') throw new Error('Cannot record payment on a cancelled invoice')
  if (invoice.status === 'PAID') throw new Error('Invoice is already fully paid')

  const totalNum = toNum(invoice.total)
  const alreadyPaid = toNum(invoice.amountPaid)
  const newAmountPaid = round2(alreadyPaid + paymentData.amount)

  let newStatus: InvoiceStatus
  if (newAmountPaid >= totalNum) {
    newStatus = 'PAID'
  } else if (newAmountPaid > 0) {
    newStatus = 'PARTIAL'
  } else {
    newStatus = invoice.status as InvoiceStatus
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          organizationId: orgId,
          invoiceId,
          amount: paymentData.amount,
          method: paymentData.method as import('@prisma/client').PaymentMethod,
          reference: paymentData.reference ?? null,
          notes: paymentData.notes ?? null,
          paidAt: paymentData.paidAt,
        },
      })

      await tx.invoice.update({
        where: { id: invoiceId },
        data: { amountPaid: newAmountPaid, status: newStatus },
      })
    })

    // Notification
    await prisma.notification.create({
      data: {
        organizationId: orgId,
        title: `Payment received – ${invoice.invoiceNumber}`,
        message: `£${paymentData.amount.toFixed(2)} received${paymentData.reference ? ` (Ref: ${paymentData.reference})` : ''}`,
        type: 'SUCCESS',
        link: `/invoices/${invoiceId}`,
      },
    }).catch((e) => console.error('[markInvoicePaid] notification failed', e))

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'payment.recorded',
      entityType: 'Invoice',
      entityId: invoiceId,
      changes: { amount: paymentData.amount, method: paymentData.method, newStatus },
      invoiceId,
      clientId: invoice.clientId,
    }).catch((e) => console.error('[markInvoicePaid] audit log failed', e))

    revalidatePath('/invoices')
    revalidatePath(`/invoices/${invoiceId}`)
  } catch (error) {
    console.error('[markInvoicePaid]', error)
    throw new Error('Failed to record payment')
  }
}

// ---------------------------------------------------------------------------
// cancelInvoice
// ---------------------------------------------------------------------------

export async function cancelInvoice(
  orgId: string,
  invoiceId: string,
  userId: string,
): Promise<void> {
  if (!orgId) throw new Error('orgId is required')
  if (!invoiceId) throw new Error('invoiceId is required')

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId: orgId },
    select: { id: true, status: true, invoiceNumber: true },
  })
  if (!invoice) throw new Error('Invoice not found')
  if (invoice.status === 'PAID') throw new Error('Cannot cancel a paid invoice')
  if (invoice.status === 'CANCELLED') throw new Error('Invoice is already cancelled')

  try {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'CANCELLED' },
    })

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'invoice.cancelled',
      entityType: 'Invoice',
      entityId: invoiceId,
      changes: { previousStatus: invoice.status },
      invoiceId,
    }).catch((e) => console.error('[cancelInvoice] audit log failed', e))

    revalidatePath('/invoices')
    revalidatePath(`/invoices/${invoiceId}`)
  } catch (error) {
    console.error('[cancelInvoice]', error)
    throw new Error('Failed to cancel invoice')
  }
}

// ---------------------------------------------------------------------------
// duplicateInvoice
// ---------------------------------------------------------------------------

export async function duplicateInvoice(
  orgId: string,
  invoiceId: string,
  userId: string,
): Promise<Invoice> {
  if (!orgId) throw new Error('orgId is required')
  if (!invoiceId) throw new Error('invoiceId is required')

  const source = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId: orgId },
    include: {
      items: true,
      vatBreakdowns: true,
    },
  })
  if (!source) throw new Error('Invoice not found')

  const newInvoiceNumber = await getNextInvoiceNumber(orgId)
  const now = new Date()
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { defaultPaymentTerms: true },
  })
  const paymentTerms = org?.defaultPaymentTerms ?? 30
  const newDueDate = new Date(now)
  newDueDate.setDate(newDueDate.getDate() + paymentTerms)

  try {
    const newInvoice = await prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          organizationId: orgId,
          clientId: source.clientId,
          invoiceNumber: newInvoiceNumber,
          issueDate: now,
          dueDate: newDueDate,
          subtotal: source.subtotal,
          discountAmount: source.discountAmount,
          discountPercent: source.discountPercent,
          vatAmount: source.vatAmount,
          total: source.total,
          amountPaid: 0,
          status: 'DRAFT',
          notes: source.notes,
          terms: source.terms,
          templateId: source.templateId,
          poNumber: source.poNumber,
          reference: source.reference,
        },
      })

      await tx.invoiceItem.createMany({
        data: source.items.map((item) => ({
          invoiceId: created.id,
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          vatRate: item.vatRate,
          vatType: item.vatType,
          vatAmount: item.vatAmount,
          lineTotal: item.lineTotal,
          lineTotalExVat: item.lineTotalExVat,
          unit: item.unit,
          sortOrder: item.sortOrder,
        })),
      })

      await tx.vatBreakdown.createMany({
        data: source.vatBreakdowns.map((vb) => ({
          invoiceId: created.id,
          vatRate: vb.vatRate,
          vatType: vb.vatType,
          netAmount: vb.netAmount,
          vatAmount: vb.vatAmount,
        })),
      })

      return created
    })

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'invoice.duplicated',
      entityType: 'Invoice',
      entityId: newInvoice.id,
      changes: { sourceInvoiceId: invoiceId, newInvoiceNumber },
      invoiceId: newInvoice.id,
    }).catch((e) => console.error('[duplicateInvoice] audit log failed', e))

    revalidatePath('/invoices')
    return serialize(newInvoice) as typeof newInvoice
  } catch (error) {
    console.error('[duplicateInvoice]', error)
    throw new Error('Failed to duplicate invoice')
  }
}

// ---------------------------------------------------------------------------
// createStripePaymentLink
// ---------------------------------------------------------------------------

export async function createStripePaymentLink(
  orgId: string,
  invoiceId: string,
): Promise<string> {
  if (!orgId) throw new Error('orgId is required')
  if (!invoiceId) throw new Error('invoiceId is required')

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId: orgId },
    select: { id: true, invoiceNumber: true, total: true, status: true },
  })
  if (!invoice) throw new Error('Invoice not found')
  if (invoice.status === 'CANCELLED') throw new Error('Cannot create payment link for cancelled invoice')
  if (invoice.status === 'PAID') throw new Error('Invoice is already paid')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://invoiceforge.co.uk'
  const amountPence = Math.round(toNum(invoice.total) * 100)

  try {
    const paymentLink = await createPaymentLink(
      invoiceId,
      amountPence,
      `Invoice ${invoice.invoiceNumber}`,
      `${appUrl}/pay/success?invoice=${invoiceId}`,
    )

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        stripePaymentLinkId: paymentLink.id,
        stripePaymentLinkUrl: paymentLink.url,
      },
    })

    revalidatePath(`/invoices/${invoiceId}`)
    return paymentLink.url
  } catch (error) {
    console.error('[createStripePaymentLink]', error)
    throw new Error('Failed to create Stripe payment link')
  }
}

// ---------------------------------------------------------------------------
// getOverdueInvoices
// ---------------------------------------------------------------------------

export async function getOverdueInvoices(orgId: string): Promise<Invoice[]> {
  if (!orgId) throw new Error('orgId is required')

  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        organizationId: orgId,
        status: { in: ['SENT', 'PARTIAL'] },
        dueDate: { lt: new Date() },
      },
      include: {
        client: { select: { id: true, companyName: true, email: true } },
      },
      orderBy: { dueDate: 'asc' },
    })

    return invoices as unknown as Invoice[]
  } catch (error) {
    console.error('[getOverdueInvoices]', error)
    throw new Error('Failed to fetch overdue invoices')
  }
}

// ---------------------------------------------------------------------------
// markOverdueInvoices  (cron-style)
// ---------------------------------------------------------------------------

export async function markOverdueInvoices(): Promise<{ updated: number }> {
  try {
    const result = await prisma.invoice.updateMany({
      where: {
        status: { in: ['SENT', 'PARTIAL'] },
        dueDate: { lt: new Date() },
      },
      data: { status: 'OVERDUE' },
    })

    console.info(`[markOverdueInvoices] Marked ${result.count} invoice(s) as OVERDUE`)
    return { updated: result.count }
  } catch (error) {
    console.error('[markOverdueInvoices]', error)
    throw new Error('Failed to mark overdue invoices')
  }
}
