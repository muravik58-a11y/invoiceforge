'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import type { Organization } from '@prisma/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UpdateOrganizationData {
  name?: string
  companyName?: string
  companyNumber?: string
  vatNumber?: string
  logo?: string
  brandColor?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  county?: string
  postcode?: string
  country?: string
  bankName?: string
  bankSortCode?: string
  bankAccountNumber?: string
  bankIban?: string
  bankSwift?: string
  paymentReference?: string
  invoicePrefix?: string
  defaultPaymentTerms?: number
  emailSignature?: string
  invoiceFooter?: string
  latePaymentNote?: string
}

// ---------------------------------------------------------------------------
// getOrCreateOrganization
// ---------------------------------------------------------------------------

/**
 * Fetch the organisation record for a given Clerk org ID, or create it if it
 * doesn't yet exist (e.g. on first dashboard load after signup).
 */
export async function getOrCreateOrganization(
  clerkOrgId: string,
  name: string,
  slug: string,
): Promise<Organization> {
  if (!clerkOrgId) throw new Error('clerkOrgId is required')
  if (!name) throw new Error('name is required')
  if (!slug) throw new Error('slug is required')

  try {
    const org = await prisma.organization.upsert({
      where: { clerkOrgId },
      update: {},
      create: {
        clerkOrgId,
        name,
        slug,
      },
    })

    return org
  } catch (error) {
    console.error('[getOrCreateOrganization]', error)
    throw new Error('Failed to get or create organisation')
  }
}

// ---------------------------------------------------------------------------
// updateOrganization
// ---------------------------------------------------------------------------

/**
 * Update an organisation's settings.
 *
 * @param orgId - The InvoiceForge (Prisma) organisation ID
 * @param data  - Partial fields to update
 */
export async function updateOrganization(
  orgId: string,
  data: UpdateOrganizationData,
): Promise<Organization> {
  if (!orgId) throw new Error('orgId is required')

  try {
    const org = await prisma.organization.update({
      where: { id: orgId },
      data,
    })

    revalidatePath('/settings')
    return org
  } catch (error) {
    console.error('[updateOrganization]', error)
    throw new Error('Failed to update organisation')
  }
}

// ---------------------------------------------------------------------------
// getOrganizationByClerkId
// ---------------------------------------------------------------------------

/**
 * Retrieve an organisation by its Clerk organisation ID.
 *
 * @param clerkOrgId - The Clerk organisation ID (org_xxx)
 */
export async function getOrganizationByClerkId(
  clerkOrgId: string,
): Promise<Organization | null> {
  if (!clerkOrgId) throw new Error('clerkOrgId is required')

  try {
    const org = await prisma.organization.findUnique({
      where: { clerkOrgId },
    })

    return org
  } catch (error) {
    console.error('[getOrganizationByClerkId]', error)
    throw new Error('Failed to fetch organisation')
  }
}

// ---------------------------------------------------------------------------
// updateOrgTemplate
// ---------------------------------------------------------------------------

export async function updateOrgTemplate(
  orgId: string,
  template: 'modern' | 'classic' | 'branded',
): Promise<void> {
  if (!orgId) throw new Error('orgId is required')
  await prisma.organization.update({
    where: { id: orgId },
    data: { preferredTemplate: template },
  })
  revalidatePath('/settings/appearance')
}

// ---------------------------------------------------------------------------
// getNextInvoiceNumber
// ---------------------------------------------------------------------------

export async function getNextInvoiceNumber(orgId: string): Promise<string> {
  if (!orgId) throw new Error('orgId is required')

  try {
    const org = await prisma.$transaction(async (tx) => {
      return tx.organization.update({
        where: { id: orgId },
        data: { invoiceCounter: { increment: 1 } },
        select: {
          invoiceCounter: true,
          invoicePrefix: true,
        },
      })
    })

    const year = new Date().getFullYear()
    const counter = org.invoiceCounter.toString().padStart(4, '0')
    const prefix = org.invoicePrefix ?? 'INV'

    return `${prefix}-${year}-${counter}`
  } catch (error) {
    console.error('[getNextInvoiceNumber]', error)
    throw new Error('Failed to generate invoice number')
  }
}
