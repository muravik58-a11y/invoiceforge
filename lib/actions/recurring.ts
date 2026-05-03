'use server'

import { revalidatePath } from 'next/cache'
import type { RecurringFrequency, RecurringInvoice, Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { createInvoice } from '@/lib/actions/invoices'
import { createAuditLog } from '@/lib/actions/audit'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecurringInvoiceCreateData {
  clientId: string
  frequency: RecurringFrequency
  nextIssueDate: Date
  isActive?: boolean
  templateData: RecurringTemplateData
}

export interface RecurringTemplateData {
  items: Array<{
    productId?: string
    description: string
    quantity: number
    unitPrice: number
    vatRate: number
    vatType: string
    unit?: string
    sortOrder?: number
  }>
  discountPercent?: number
  notes?: string
  terms?: string
  templateId?: string
  poNumber?: string
  reference?: string
  paymentTermsDays?: number  // override org default
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Calculate the next issue date based on the current date and frequency.
 */
function calculateNextIssueDate(from: Date, frequency: RecurringFrequency): Date {
  const next = new Date(from)
  switch (frequency) {
    case 'WEEKLY':
      next.setDate(next.getDate() + 7)
      break
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1)
      break
    case 'QUARTERLY':
      next.setMonth(next.getMonth() + 3)
      break
    case 'ANNUALLY':
      next.setFullYear(next.getFullYear() + 1)
      break
  }
  return next
}

// ---------------------------------------------------------------------------
// getRecurringInvoices
// ---------------------------------------------------------------------------

export async function getRecurringInvoices(orgId: string): Promise<RecurringInvoice[]> {
  if (!orgId) throw new Error('orgId is required')

  try {
    const recurring = await prisma.recurringInvoice.findMany({
      where: { organizationId: orgId },
      include: {
        client: {
          select: { id: true, companyName: true, email: true },
        },
        invoices: {
          select: { id: true, invoiceNumber: true, issueDate: true, total: true, status: true },
          orderBy: { issueDate: 'desc' },
          take: 5,
        },
      },
      orderBy: { nextIssueDate: 'asc' },
    })

    return recurring as unknown as RecurringInvoice[]
  } catch (error) {
    console.error('[getRecurringInvoices]', error)
    throw new Error('Failed to fetch recurring invoices')
  }
}

// ---------------------------------------------------------------------------
// createRecurringInvoice
// ---------------------------------------------------------------------------

export async function createRecurringInvoice(
  orgId: string,
  userId: string,
  data: RecurringInvoiceCreateData,
): Promise<RecurringInvoice> {
  if (!orgId) throw new Error('orgId is required')
  if (!data.clientId) throw new Error('clientId is required')
  if (!data.frequency) throw new Error('frequency is required')
  if (!data.nextIssueDate) throw new Error('nextIssueDate is required')
  if (!data.templateData?.items?.length) throw new Error('At least one item is required in templateData')

  // Validate client belongs to org
  const client = await prisma.client.findFirst({
    where: { id: data.clientId, organizationId: orgId },
    select: { id: true },
  })
  if (!client) throw new Error('Client not found')

  try {
    const recurring = await prisma.recurringInvoice.create({
      data: {
        organizationId: orgId,
        clientId: data.clientId,
        frequency: data.frequency,
        nextIssueDate: data.nextIssueDate,
        isActive: data.isActive ?? true,
        templateData: data.templateData as unknown as Prisma.InputJsonValue,
      },
    })

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'recurring.created',
      entityType: 'RecurringInvoice',
      entityId: recurring.id,
      changes: { frequency: data.frequency, clientId: data.clientId, nextIssueDate: data.nextIssueDate },
      clientId: data.clientId,
    }).catch((e) => console.error('[createRecurringInvoice] audit log failed', e))

    revalidatePath('/recurring')
    return recurring
  } catch (error) {
    console.error('[createRecurringInvoice]', error)
    throw new Error('Failed to create recurring invoice')
  }
}

// ---------------------------------------------------------------------------
// updateRecurringInvoice
// ---------------------------------------------------------------------------

export async function updateRecurringInvoice(
  orgId: string,
  id: string,
  userId: string,
  data: Partial<RecurringInvoiceCreateData>,
): Promise<RecurringInvoice> {
  if (!orgId) throw new Error('orgId is required')
  if (!id) throw new Error('id is required')

  const existing = await prisma.recurringInvoice.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true },
  })
  if (!existing) throw new Error('Recurring invoice not found')

  const updatePayload: Prisma.RecurringInvoiceUpdateInput = {}
  if (data.frequency) updatePayload.frequency = data.frequency
  if (data.nextIssueDate) updatePayload.nextIssueDate = data.nextIssueDate
  if (data.isActive !== undefined) updatePayload.isActive = data.isActive
  if (data.templateData) updatePayload.templateData = data.templateData as unknown as Prisma.InputJsonValue
  if (data.clientId) updatePayload.client = { connect: { id: data.clientId } }

  try {
    const recurring = await prisma.recurringInvoice.update({
      where: { id },
      data: updatePayload,
    })

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: 'recurring.updated',
      entityType: 'RecurringInvoice',
      entityId: id,
      changes: data,
    }).catch((e) => console.error('[updateRecurringInvoice] audit log failed', e))

    revalidatePath('/recurring')
    return recurring
  } catch (error) {
    console.error('[updateRecurringInvoice]', error)
    throw new Error('Failed to update recurring invoice')
  }
}

// ---------------------------------------------------------------------------
// toggleRecurringInvoice
// ---------------------------------------------------------------------------

export async function toggleRecurringInvoice(
  orgId: string,
  id: string,
  userId: string,
  isActive: boolean,
): Promise<RecurringInvoice> {
  if (!orgId) throw new Error('orgId is required')
  if (!id) throw new Error('id is required')

  const existing = await prisma.recurringInvoice.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true, isActive: true },
  })
  if (!existing) throw new Error('Recurring invoice not found')

  try {
    const recurring = await prisma.recurringInvoice.update({
      where: { id },
      data: { isActive },
    })

    await createAuditLog({
      organizationId: orgId,
      userId,
      action: isActive ? 'recurring.activated' : 'recurring.paused',
      entityType: 'RecurringInvoice',
      entityId: id,
      changes: { isActive },
    }).catch((e) => console.error('[toggleRecurringInvoice] audit log failed', e))

    revalidatePath('/recurring')
    return recurring
  } catch (error) {
    console.error('[toggleRecurringInvoice]', error)
    throw new Error('Failed to toggle recurring invoice')
  }
}

// ---------------------------------------------------------------------------
// processRecurringInvoices  (cron-style)
// ---------------------------------------------------------------------------

/**
 * Processes all active recurring invoice templates where nextIssueDate <= now.
 * Creates an invoice for each, then advances the nextIssueDate.
 * Designed to be called from a cron route handler.
 */
export async function processRecurringInvoices(): Promise<{
  processed: number
  errors: Array<{ id: string; error: string }>
}> {
  const now = new Date()
  const due = await prisma.recurringInvoice.findMany({
    where: {
      isActive: true,
      nextIssueDate: { lte: now },
    },
    include: {
      organization: {
        select: { id: true, defaultPaymentTerms: true },
      },
    },
  })

  let processed = 0
  const errors: Array<{ id: string; error: string }> = []

  for (const recurring of due) {
    try {
      const templateData = recurring.templateData as unknown as RecurringTemplateData
      const orgId = recurring.organizationId
      const issueDate = new Date(recurring.nextIssueDate)
      const paymentTermsDays = templateData.paymentTermsDays ?? recurring.organization.defaultPaymentTerms ?? 30
      const dueDate = new Date(issueDate)
      dueDate.setDate(dueDate.getDate() + paymentTermsDays)

      // Create the invoice using the existing createInvoice action
      // Use a system userId for cron-generated invoices
      const CRON_USER_ID = 'system-cron'
      const invoice = await createInvoice(orgId, CRON_USER_ID, {
        clientId: recurring.clientId,
        issueDate,
        dueDate,
        items: templateData.items,
        discountPercent: templateData.discountPercent,
        notes: templateData.notes,
        terms: templateData.terms,
        templateId: templateData.templateId,
        poNumber: templateData.poNumber,
        reference: templateData.reference,
      })

      // Advance schedule
      const nextDate = calculateNextIssueDate(issueDate, recurring.frequency)
      await prisma.recurringInvoice.update({
        where: { id: recurring.id },
        data: {
          lastIssuedDate: issueDate,
          nextIssueDate: nextDate,
          invoices: { connect: { id: invoice.id } },
        },
      })

      // Link the invoice back to the recurring template
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { recurringInvoiceId: recurring.id },
      })

      // Notify the organisation
      await prisma.notification.create({
        data: {
          organizationId: orgId,
          title: 'Recurring invoice created',
          message: `Invoice ${invoice.invoiceNumber} was automatically generated from your recurring schedule.`,
          type: 'INFO',
          link: `/invoices/${invoice.id}`,
        },
      }).catch(() => null)

      processed++
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      console.error(`[processRecurringInvoices] Failed for recurring ${recurring.id}:`, err)
      errors.push({ id: recurring.id, error: msg })
    }
  }

  console.info(`[processRecurringInvoices] Processed: ${processed}, Errors: ${errors.length}`)
  return { processed, errors }
}
