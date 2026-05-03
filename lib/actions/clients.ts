'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import type { Client, Prisma } from '@prisma/client'
import { serialize } from '@/lib/serialize'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateClientData {
  companyName: string
  contactName?: string
  email?: string
  phone?: string
  vatNumber?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  county?: string
  postcode?: string
  country?: string
  defaultPaymentTerms?: number
  defaultTaxRate?: number
  currency?: string
  notes?: string
}

export interface UpdateClientData extends Partial<CreateClientData> {}

export interface PaginatedClients {
  clients: Client[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ImportClientsResult {
  imported: number
  skipped: number
  errors: Array<{ row: number; message: string }>
}

// ---------------------------------------------------------------------------
// getClients
// ---------------------------------------------------------------------------

/**
 * Fetch a paginated, optionally-filtered list of clients for an organisation.
 *
 * @param orgId  - The InvoiceForge organisation ID
 * @param search - Optional substring to match against company name, contact name or email
 * @param page   - 1-based page number (default 1)
 * @param limit  - Items per page (default 20)
 */
export async function getClients(
  orgId: string,
  search?: string,
  page = 1,
  limit = 20,
): Promise<PaginatedClients> {
  if (!orgId) throw new Error('orgId is required')

  const skip = (page - 1) * limit

  const where: Prisma.ClientWhereInput = {
    organizationId: orgId,
    isActive: true,
    ...(search
      ? {
          OR: [
            { companyName: { contains: search, mode: 'insensitive' } },
            { contactName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  }

  try {
    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { companyName: 'asc' },
      }),
      prisma.client.count({ where }),
    ])

    return {
      clients,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  } catch (error) {
    console.error('[getClients]', error)
    throw new Error('Failed to fetch clients')
  }
}

// ---------------------------------------------------------------------------
// getClient
// ---------------------------------------------------------------------------

/**
 * Fetch a single client, ensuring it belongs to the given organisation.
 *
 * @param orgId    - The InvoiceForge organisation ID
 * @param clientId - The client's Prisma ID
 */
export async function getClient(
  orgId: string,
  clientId: string,
): Promise<Client | null> {
  if (!orgId) throw new Error('orgId is required')
  if (!clientId) throw new Error('clientId is required')

  try {
    const client = await prisma.client.findFirst({
      where: { id: clientId, organizationId: orgId },
    })

    return client
  } catch (error) {
    console.error('[getClient]', error)
    throw new Error('Failed to fetch client')
  }
}

// ---------------------------------------------------------------------------
// createClient
// ---------------------------------------------------------------------------

/**
 * Create a new client within an organisation.
 *
 * @param orgId - The InvoiceForge organisation ID
 * @param data  - Client fields
 */
export async function createClient(
  orgId: string,
  data: CreateClientData,
): Promise<Client> {
  if (!orgId) throw new Error('orgId is required')
  if (!data.companyName) throw new Error('companyName is required')

  try {
    const client = await prisma.client.create({
      data: {
        organizationId: orgId,
        companyName: data.companyName,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
        vatNumber: data.vatNumber,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        county: data.county,
        postcode: data.postcode,
        country: data.country ?? 'United Kingdom',
        defaultPaymentTerms: data.defaultPaymentTerms ?? 30,
        defaultTaxRate: data.defaultTaxRate,
        currency: data.currency ?? 'GBP',
        notes: data.notes,
      },
    })

    revalidatePath('/clients')
    return serialize(client) as typeof client
  } catch (error) {
    console.error('[createClient]', error)
    throw new Error('Failed to create client')
  }
}

// ---------------------------------------------------------------------------
// updateClient
// ---------------------------------------------------------------------------

/**
 * Update an existing client.
 *
 * @param orgId    - The InvoiceForge organisation ID
 * @param clientId - The client's Prisma ID
 * @param data     - Fields to update
 */
export async function updateClient(
  orgId: string,
  clientId: string,
  data: UpdateClientData,
): Promise<Client> {
  if (!orgId) throw new Error('orgId is required')
  if (!clientId) throw new Error('clientId is required')

  // Confirm the client belongs to this org
  const existing = await prisma.client.findFirst({
    where: { id: clientId, organizationId: orgId },
    select: { id: true },
  })

  if (!existing) throw new Error('Client not found')

  try {
    const client = await prisma.client.update({
      where: { id: clientId },
      data: {
        ...(data.companyName !== undefined && { companyName: data.companyName }),
        ...(data.contactName !== undefined && { contactName: data.contactName }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.vatNumber !== undefined && { vatNumber: data.vatNumber }),
        ...(data.addressLine1 !== undefined && { addressLine1: data.addressLine1 }),
        ...(data.addressLine2 !== undefined && { addressLine2: data.addressLine2 }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.county !== undefined && { county: data.county }),
        ...(data.postcode !== undefined && { postcode: data.postcode }),
        ...(data.country !== undefined && { country: data.country }),
        ...(data.defaultPaymentTerms !== undefined && { defaultPaymentTerms: data.defaultPaymentTerms }),
        ...(data.defaultTaxRate !== undefined && { defaultTaxRate: data.defaultTaxRate }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    })

    revalidatePath('/clients')
    revalidatePath(`/clients/${clientId}`)
    return serialize(client) as typeof client
  } catch (error) {
    console.error('[updateClient]', error)
    throw new Error('Failed to update client')
  }
}

// ---------------------------------------------------------------------------
// deleteClient
// ---------------------------------------------------------------------------

/**
 * Soft-delete a client by setting isActive to false.
 * Hard deletes are avoided to preserve historical invoice data.
 *
 * @param orgId    - The InvoiceForge organisation ID
 * @param clientId - The client's Prisma ID
 */
export async function deleteClient(
  orgId: string,
  clientId: string,
): Promise<void> {
  if (!orgId) throw new Error('orgId is required')
  if (!clientId) throw new Error('clientId is required')

  const existing = await prisma.client.findFirst({
    where: { id: clientId, organizationId: orgId },
    select: { id: true },
  })

  if (!existing) throw new Error('Client not found')

  try {
    await prisma.client.update({
      where: { id: clientId },
      data: { isActive: false },
    })

    revalidatePath('/clients')
  } catch (error) {
    console.error('[deleteClient]', error)
    throw new Error('Failed to delete client')
  }
}

// ---------------------------------------------------------------------------
// importClients
// ---------------------------------------------------------------------------

/**
 * Parse a CSV string and bulk-import clients into the organisation.
 *
 * Expected CSV columns (header row required):
 *   companyName, contactName, email, phone, vatNumber,
 *   addressLine1, addressLine2, city, county, postcode, country,
 *   defaultPaymentTerms, currency, notes
 *
 * @param orgId   - The InvoiceForge organisation ID
 * @param csvData - Raw CSV string (UTF-8)
 */
export async function importClients(
  orgId: string,
  csvData: string,
): Promise<ImportClientsResult> {
  if (!orgId) throw new Error('orgId is required')
  if (!csvData) throw new Error('csvData is required')

  const lines = csvData
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length < 2) {
    throw new Error('CSV must contain a header row and at least one data row')
  }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())

  const getColumn = (row: string[], key: string): string | undefined => {
    const idx = headers.indexOf(key)
    if (idx === -1) return undefined
    const value = row[idx]?.trim()
    return value === '' ? undefined : value
  }

  let imported = 0
  let skipped = 0
  const errors: ImportClientsResult['errors'] = []

  for (let i = 1; i < lines.length; i++) {
    // Naive CSV split — does not handle quoted commas; suitable for simple data
    const row = lines[i].split(',')
    const companyName = getColumn(row, 'companyname')

    if (!companyName) {
      errors.push({ row: i + 1, message: 'Missing required field: companyName' })
      skipped++
      continue
    }

    try {
      await prisma.client.create({
        data: {
          organizationId: orgId,
          companyName,
          contactName: getColumn(row, 'contactname'),
          email: getColumn(row, 'email'),
          phone: getColumn(row, 'phone'),
          vatNumber: getColumn(row, 'vatnumber'),
          addressLine1: getColumn(row, 'addressline1'),
          addressLine2: getColumn(row, 'addressline2'),
          city: getColumn(row, 'city'),
          county: getColumn(row, 'county'),
          postcode: getColumn(row, 'postcode'),
          country: getColumn(row, 'country') ?? 'United Kingdom',
          defaultPaymentTerms: getColumn(row, 'defaultpaymentterms')
            ? parseInt(getColumn(row, 'defaultpaymentterms')!, 10)
            : 30,
          currency: getColumn(row, 'currency') ?? 'GBP',
          notes: getColumn(row, 'notes'),
        },
      })
      imported++
    } catch (error) {
      console.error(`[importClients] Row ${i + 1}:`, error)
      errors.push({ row: i + 1, message: 'Failed to import row — check for duplicates or invalid data' })
      skipped++
    }
  }

  revalidatePath('/clients')

  return { imported, skipped, errors }
}
