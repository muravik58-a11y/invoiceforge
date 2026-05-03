import { auth } from '@clerk/nextjs/server'
import { getOrganizationByClerkId } from '@/lib/actions/organization'
import prisma from '@/lib/prisma'
import type { Client } from '@prisma/client'

// RFC 4180 CSV escaping: wrap field in double-quotes if it contains
// commas, double-quotes, or newlines; escape internal double-quotes by doubling them.
function escapeCsvField(value: string | null | undefined): string {
  const str = value ?? ''
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function buildCsvRow(fields: (string | null | undefined)[]): string {
  return fields.map(escapeCsvField).join(',')
}

export async function GET(req: Request) {
  try {
    const { orgId: clerkOrgId, userId } = await auth()

    if (!userId || !clerkOrgId) {
      return new Response('Unauthorised', { status: 401 })
    }

    const org = await getOrganizationByClerkId(clerkOrgId)
    if (!org) {
      return new Response('Organisation not found', { status: 404 })
    }

    const clients = await prisma.client.findMany({
      where: { organizationId: org.id, isActive: true },
      orderBy: { companyName: 'asc' },
    })

    const headers = [
      'Company Name',
      'Contact Name',
      'Email',
      'Phone',
      'VAT Number',
      'Address Line 1',
      'Address Line 2',
      'City',
      'County',
      'Postcode',
      'Country',
      'Currency',
      'Default Payment Terms (days)',
      'Notes',
      'Created At',
    ]

    const rows = clients.map((client: Client) =>
      buildCsvRow([
        client.companyName,
        client.contactName,
        client.email,
        client.phone,
        client.vatNumber,
        client.addressLine1,
        client.addressLine2,
        client.city,
        client.county,
        client.postcode,
        client.country,
        client.currency,
        client.defaultPaymentTerms?.toString(),
        client.notes,
        client.createdAt.toISOString(),
      ]),
    )

    const csvContent = [buildCsvRow(headers), ...rows].join('\r\n')

    // Use today's date in the filename (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0]
    const filename = `clients-${today}.csv`

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[GET /api/clients/export]', err)
    return new Response('Failed to export clients', { status: 500 })
  }
}
