'use server'

import prisma from '@/lib/prisma'
import type { AuditLog, Prisma } from '@prisma/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateAuditLogData {
  organizationId: string
  userId: string
  userEmail?: string
  action: string       // e.g. "invoice.created", "payment.recorded"
  entityType: string   // e.g. "Invoice", "Client"
  entityId: string
  changes?: Record<string, unknown> | null
  invoiceId?: string
  clientId?: string
}

// ---------------------------------------------------------------------------
// createAuditLog
// ---------------------------------------------------------------------------

/**
 * Insert an immutable audit-log entry.
 * This function is intentionally non-throwing so callers can fire-and-forget
 * with .catch() and not break their main workflow.
 */
export async function createAuditLog(data: CreateAuditLogData): Promise<AuditLog> {
  if (!data.organizationId) throw new Error('organizationId is required')
  if (!data.userId) throw new Error('userId is required')
  if (!data.action) throw new Error('action is required')
  if (!data.entityType) throw new Error('entityType is required')
  if (!data.entityId) throw new Error('entityId is required')

  // Resolve userEmail: if not provided look it up from a previous log entry
  // (avoids requiring the caller to pass it every time)
  let userEmail = data.userEmail ?? ''
  if (!userEmail) {
    const prev = await prisma.auditLog.findFirst({
      where: { organizationId: data.organizationId, userId: data.userId },
      select: { userEmail: true },
      orderBy: { createdAt: 'desc' },
    }).catch(() => null)
    userEmail = prev?.userEmail ?? data.userId
  }

  try {
    const log = await prisma.auditLog.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        userEmail,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        changes: (data.changes ?? null) as Prisma.InputJsonValue,
        invoiceId: data.invoiceId ?? null,
        clientId: data.clientId ?? null,
      },
    })

    return log
  } catch (error) {
    console.error('[createAuditLog]', error)
    throw new Error('Failed to create audit log')
  }
}

// ---------------------------------------------------------------------------
// getAuditLogs
// ---------------------------------------------------------------------------

/**
 * Fetch audit log entries for an organisation, with optional filters.
 *
 * @param orgId   - The InvoiceForge organisation ID
 * @param filters - Optional filters: entityId, entityType, limit
 */
export async function getAuditLogs(
  orgId: string,
  filters?: {
    entityId?: string
    entityType?: string
    invoiceId?: string
    clientId?: string
    userId?: string
    limit?: number
  },
): Promise<AuditLog[]> {
  if (!orgId) throw new Error('orgId is required')

  const limit = filters?.limit ?? 100

  const where: Prisma.AuditLogWhereInput = {
    organizationId: orgId,
    ...(filters?.entityType && { entityType: filters.entityType }),
    ...(filters?.entityId && { entityId: filters.entityId }),
    ...(filters?.invoiceId && { invoiceId: filters.invoiceId }),
    ...(filters?.clientId && { clientId: filters.clientId }),
    ...(filters?.userId && { userId: filters.userId }),
  }

  try {
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return logs
  } catch (error) {
    console.error('[getAuditLogs]', error)
    throw new Error('Failed to fetch audit logs')
  }
}
